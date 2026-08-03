import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  NotImplementedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '../notifications/dto/create-notification.dto';
import { PaymentsService } from '../payments/payments.service';
import { InvoicesService } from '../invoices/invoices.service';
import { OrderHistoryQueryDto } from './dto/order-history-query.dto';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { InitiateReturnDto } from './dto/initiate-return.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderPaymentStatusDto } from './dto/update-order-payment-status.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderCancelledEvent, OrderCancelledItem } from './events/order-cancelled.event';
import { OrderStatus, PaymentStatus, ActorType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { calculateTax, isInterStateShipping } from '../../common/utils/tax.util';

interface CartLikeItem {
  productId: string;
  variantId: string | null;
  quantity: number;
  type: string;
  rentStart: Date | null;
  rentEnd: Date | null;
}

interface CartLikeItemWithDetails extends CartLikeItem {
  product: {
    id: string;
    name: string;
    basePrice: Prisma.Decimal;
    salePrice: Prisma.Decimal | null;
    isActive: boolean;
  };
  variant: {
    id: string;
    isActive: boolean;
    deletedAt: Date | null;
    salePrice: Prisma.Decimal | null;
  } | null;
}

interface InventorySummaryLock {
  variantId: string;
  storeId: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityLocked: number;
  quantitySold: number;
  updatedAt: Date;
}

const ORDER_INCLUDE = {
  items: {
    include: {
      product: {
        select: { id: true, name: true, slug: true, images: true },
      },
      variant: {
        select: { id: true, size: true, color: true },
      },
    },
  },
} as const;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly paymentsService: PaymentsService,
    private readonly invoicesService: InvoicesService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * FIX-2 (QA / SEC-06): every owner-scoped order operation must have at least
   * one verified identity. Anonymous callers pass `null`/`undefined` for both —
   * never let a null/undefined owner filter reach Prisma (Prisma treats
   * `{ userId: null }` as "match rows where userId IS NULL", which exposes ALL
   * guest orders).
   */
  private assertOwnerContext(userId?: string | null, guestSessionId?: string): void {
    if (!userId && !guestSessionId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  /**
   * FIX-2 (QA / SEC-06): ownership check shared by single-order routes. Rejects
   * anonymous callers AND callers whose verified identity does not own the order.
   */
  private assertOrderOwnership(
    order: { userId: string | null; guestSessionId: string | null },
    userId?: string | null,
    guestSessionId?: string,
  ): void {
    this.assertOwnerContext(userId, guestSessionId);
    const ownsOrder = guestSessionId
      ? order.guestSessionId === guestSessionId
      : order.userId === userId;
    if (!ownsOrder) {
      throw new UnauthorizedException('This order does not belong to you');
    }
  }

  async create(userId: string | null, dto: CreateOrderDto, guestSessionId?: string) {
    const customerLabel = guestSessionId ? 'guest' : 'customer';
    // FIX-2: an order must always be attached to a verified customer or guest
    // session — anonymous order creation is rejected before any cart lookup.
    this.assertOwnerContext(userId, guestSessionId);
    this.logger.log({ userId, guestSessionId, action: `order.create.start.${customerLabel}` });

    // For guests, fetch guest cart items. For customers, fetch regular cart.
    let guestCartItems: Array<CartLikeItemWithDetails> | null = null;
    let cart: {
      id: string;
      items: Array<CartLikeItemWithDetails>;
    } | null = null;

    if (guestSessionId) {
      guestCartItems = (await this.prisma.guestCartItem.findMany({
        where: { guestSessionId },
        include: {
          product: {
            select: { id: true, name: true, basePrice: true, salePrice: true, isActive: true },
          },
          variant: {
            select: { id: true, isActive: true, deletedAt: true, salePrice: true },
          },
        },
      })) as unknown as Array<CartLikeItemWithDetails>;

      if (!guestCartItems || guestCartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }
    } else {
      // Narrowing: assertOwnerContext guarantees userId is present whenever
      // guestSessionId is absent.
      if (!userId) {
        throw new UnauthorizedException('Authentication required');
      }
      const rawCart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, basePrice: true, salePrice: true, isActive: true },
              },
              variant: {
                select: { id: true, isActive: true, deletedAt: true, salePrice: true },
              },
            },
          },
        },
      });

      if (!rawCart || rawCart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }
      cart = { id: rawCart.id, items: rawCart.items as unknown as CartLikeItemWithDetails[] };
    }

    const cartItems = guestCartItems || cart!.items;

    // Resolve store for inventory locking
    let storeId = dto.storeId;
    if (!storeId) {
      const defaultStore = await this.prisma.storeLocation.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!defaultStore) {
        throw new BadRequestException('No active store found. Please contact support.');
      }
      storeId = defaultStore.id;
    }

    // Generate order number
    const orderNumber = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Build order items data with real prices from DB and tax calculation
    let subtotal = 0;
    let totalTaxAmount = 0;
    const orderItemsData: Array<{
      productId: string;
      variantId: string | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      type: string;
      taxRate: Prisma.Decimal;
      cgstAmount: Prisma.Decimal;
      sgstAmount: Prisma.Decimal;
      igstAmount: Prisma.Decimal;
      hsnCode: string | null;
    }> = [];

    const inventoryDecrementMap = new Map<string, number>();

    for (const item of cartItems) {
      let unitPrice: Prisma.Decimal;

      if (item.variantId && item.variant) {
        if (!item.variant.isActive || item.variant.deletedAt) {
          throw new BadRequestException(`Variant ${item.variantId} is not available`);
        }

        if (!item.product.isActive) {
          throw new BadRequestException(`Product ${item.product.name} is not active`);
        }

        unitPrice = item.variant.salePrice || item.product.salePrice || item.product.basePrice;

        const currentQty = inventoryDecrementMap.get(item.variantId) ?? 0;
        inventoryDecrementMap.set(item.variantId, currentQty + item.quantity);
      } else if (!item.variantId) {
        if (!item.product.isActive) {
          throw new BadRequestException(`Product ${item.product.name} is not active`);
        }
        unitPrice = item.product.salePrice || item.product.basePrice;
      } else {
        throw new BadRequestException(`Variant ${item.variantId} is not available`);
      }

      const totalPrice = unitPrice.mul(item.quantity);
      subtotal += Number(totalPrice);

      // Calculate tax for this item
      const interState = isInterStateShipping();
      const tax = calculateTax(Number(unitPrice), item.quantity, interState);

      totalTaxAmount += tax.totalTax;

      orderItemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        subtotal: totalPrice,
        type: item.type || 'sale',
        taxRate: new Prisma.Decimal(tax.taxRate),
        cgstAmount: new Prisma.Decimal(tax.cgstAmount),
        sgstAmount: new Prisma.Decimal(tax.sgstAmount),
        igstAmount: new Prisma.Decimal(tax.igstAmount),
        hsnCode: null,
      });
    }

    const taxAmount = Math.round(totalTaxAmount * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    // Create order + decrement inventory in a Prisma $transaction with FOR UPDATE locks
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          ...(guestSessionId ? { guestSessionId } : { userId }),
          totalAmount,
          subtotal,
          taxAmount,
          shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes || null,
          channel: 'online',
          storeId,
          items: {
            create: orderItemsData,
          },
        },
        include: ORDER_INCLUDE,
      });

      // Decrement inventory with row-level locks to prevent overselling
      const sortedVariantIds = Array.from(inventoryDecrementMap.keys()).sort();
      for (const variantId of sortedVariantIds) {
        const qty = inventoryDecrementMap.get(variantId) ?? 0;

        const locked = await tx.$queryRaw<Array<InventorySummaryLock>>`
          SELECT * FROM inventory_summary
          WHERE "variantId" = ${variantId} AND "storeId" = ${storeId}
          FOR UPDATE;
        `;

        const summary = locked[0];

        if (!summary || summary.quantityAvailable < qty) {
          throw new ConflictException({
            message:
              'This item is no longer available in the requested quantity. Please remove it from your cart and try again.',
            itemUnavailable: true,
          });
        }

        await tx.inventorySummary.update({
          where: {
            variantId_storeId: {
              variantId,
              storeId: summary.storeId,
            },
          },
          data: {
            quantityAvailable: { decrement: qty },
            quantityReserved: { increment: qty },
          },
        });

        await tx.stockMovement.create({
          data: {
            variantId,
            storeId,
            quantityChange: -qty,
            type: 'RESERVATION',
            reference: `order:${created.id}`,
            notes: `Reserved ${qty} item(s) for order ${created.orderNumber}`,
          },
        });
      }

      // Persist shipping address as a ShippingAddress record
      await tx.shippingAddress.create({
        data: {
          orderId: created.id,
          name: dto.shippingAddress.name,
          phone: dto.shippingAddress.phone,
          line1: dto.shippingAddress.line1,
          line2: dto.shippingAddress.line2 || null,
          city: dto.shippingAddress.city,
          state: dto.shippingAddress.state,
          pincode: dto.shippingAddress.pincode,
        },
      });

      // Clear the cart items after successful order creation
      if (guestSessionId) {
        await tx.guestCartItem.deleteMany({
          where: { guestSessionId },
        });
      } else {
        await tx.cartItem.deleteMany({
          where: { cartId: cart!.id },
        });
      }

      return created;
    });

    this.logger.log({
      userId,
      guestSessionId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: Number(totalAmount),
      itemCount: orderItemsData.length,
      action: 'order.created',
    });

    // Create Razorpay order for payment processing
    const amountInPaise = Math.round(Number(totalAmount) * 100);
    let razorpayOrder: Record<string, unknown> | null = null;
    let razorpayError: string | null = null;

    try {
      razorpayOrder = (await this.paymentsService.createOrderWithRetry({
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        notes: { order_type: 'sale' },
      })) as Record<string, unknown>;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          error: err.message,
          stack: err.stack,
          amount: amountInPaise,
          paymentMethod: dto.paymentMethod,
        },
        'Failed to create Razorpay order',
      );

      // Try to create a payment link as fallback so the user can pay later
      if (dto.paymentMethod === 'razorpay') {
        try {
          const paymentLink = await this.paymentsService.createPaymentLink(order.id, amountInPaise);
          razorpayError = `Failed to initialize payment gateway. A payment link has been sent to your email. You can also pay here: ${paymentLink.shortUrl}`;
          this.logger.log(
            {
              orderId: order.id,
              paymentLinkId: paymentLink.paymentLinkId,
              shortUrl: paymentLink.shortUrl,
            },
            'Payment link created as fallback for failed Razorpay order creation',
          );
        } catch (linkError) {
          this.logger.error(
            { orderId: order.id, linkError: (linkError as Error).message },
            'Failed to create payment link fallback',
          );
          razorpayError =
            'Failed to initialize payment gateway. Please try Cash on Delivery or contact support.';
        }
      } else {
        razorpayError =
          'Failed to initialize payment gateway. Please try Cash on Delivery or contact support.';
      }
    }

    const razorpayKeyId = this.config.get<string>('RAZORPAY_KEY_ID') || '';

    // Log warning if Razorpay order creation failed but user selected razorpay payment method
    if (!razorpayOrder && dto.paymentMethod === 'razorpay') {
      this.logger.warn(
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentMethod: dto.paymentMethod,
          razorpayError,
        },
        'Order created but Razorpay payment initialization failed. User may need to pay via payment link or switch to COD.',
      );
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        id: item.id,
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      shippingAddress: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes || null,
      createdAt: order.createdAt,
      razorpayOrderId: razorpayOrder?.id || null,
      razorpayKeyId,
      amount: amountInPaise,
      currency: 'INR',
      razorpayError,
    };
  }

  async findAll(): Promise<never> {
    throw new NotImplementedException('Admin order listing is not yet implemented.');
  }

  async findOne(_id?: string): Promise<never> {
    void _id;
    throw new NotImplementedException('Use GET /orders/my/:id for user-specific order lookup.');
  }

  async update(_id?: string, _updateOrderDto?: unknown): Promise<never> {
    void _id;
    void _updateOrderDto;
    throw new NotImplementedException('Order update is not yet implemented.');
  }

  async findAllAdmin(query: AdminOrderQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ...ORDER_INCLUDE,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
          },
          payments: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        ...ORDER_INCLUDE,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true },
        },
        payments: true,
        shippingAddresses: true,
        courierReceipts: true,
        invoices: true,
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async getOrderStatusLogs(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.prisma.orderStatusLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto, changedBy?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // State machine validation
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PACKED', 'CANCELLED'],
      PACKED: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: ['RETURNED'],
      CANCELLED: [],
      PARTIALLY_CANCELLED: [],
      RETURNED: [],
    };

    const allowed = allowedTransitions[order.status];
    if (!allowed || !allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${dto.status}`);
    }

    // If cancelling, restore inventory in a transaction
    if (dto.status === 'CANCELLED') {
      let storeId = order.storeId;
      if (!storeId) {
        const defaultStore = await this.prisma.storeLocation.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        });
        if (!defaultStore) {
          throw new BadRequestException('No active store found. Please contact support.');
        }
        storeId = defaultStore.id;
      }

      const updatedOrder = await this.prisma.$transaction(async (tx) => {
        const orderItems = await tx.orderItem.findMany({
          where: { orderId },
          select: { variantId: true, quantity: true },
        });

        for (const item of orderItems) {
          if (!item.variantId) continue;

          const locked = await tx.$queryRaw<Array<InventorySummaryLock>>`
            SELECT * FROM inventory_summary
            WHERE "variantId" = ${item.variantId} AND "storeId" = ${storeId}
            FOR UPDATE;
          `;

          const summary = locked[0];
          if (summary) {
            const decrementField =
              summary.quantitySold >= item.quantity
                ? { quantitySold: { decrement: item.quantity } }
                : { quantityReserved: { decrement: item.quantity } };
            await tx.inventorySummary.update({
              where: {
                variantId_storeId: {
                  variantId: item.variantId,
                  storeId,
                },
              },
              data: {
                quantityAvailable: { increment: item.quantity },
                ...decrementField,
              },
            });
          }
        }

        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: dto.status,
            cancelledAt: new Date(),
            notes: dto.note ? `${order.notes || ''}\nCancelled: ${dto.note}`.trim() : order.notes,
          },
          include: ORDER_INCLUDE,
        });

        await tx.orderStatusLog.create({
          data: {
            orderId,
            fromStatus: order.status,
            toStatus: dto.status,
            changedBy: changedBy || null,
            note: dto.note || null,
          },
        });

        return updated;
      });

      this.logger.log({
        orderId,
        from: order.status,
        to: dto.status,
        changedBy,
        action: 'order.status.updated',
      });

      await this.sendOrderNotifications(
        order.userId,
        orderId,
        dto.status,
        updatedOrder.orderNumber,
      );

      return updatedOrder;
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        ...(dto.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      },
      include: ORDER_INCLUDE,
    });

    await this.prisma.orderStatusLog.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: dto.status,
        changedBy: changedBy || null,
        note: dto.note || null,
      },
    });

    this.logger.log({
      orderId,
      from: order.status,
      to: dto.status,
      changedBy,
      action: 'order.status.updated',
    });

    await this.sendOrderNotifications(order.userId, orderId, dto.status, updated.orderNumber);

    return updated;
  }

  async updateOrderPaymentStatus(
    orderId: string,
    dto: UpdateOrderPaymentStatusDto,
    changedBy?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only CASH/COD payment method orders can be manually updated by admin
    const cashMethods = ['cash', 'cod'];
    if (!order.paymentMethod || !cashMethods.includes(order.paymentMethod.toLowerCase())) {
      throw new BadRequestException('Only cash delivery orders can have payment status updated');
    }

    // Enforce allowed transitions: PENDING → PAID or PENDING → FAILED only
    const allowedPaymentTransitions: Record<string, string[]> = {
      PENDING: ['PAID', 'FAILED'],
    };
    const allowed = allowedPaymentTransitions[order.paymentStatus];
    if (!allowed || !allowed.includes(dto.paymentStatus)) {
      throw new BadRequestException(
        `Cannot transition payment status from ${order.paymentStatus} to ${dto.paymentStatus}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: dto.paymentStatus as PaymentStatus,
        notes: dto.note ? `${order.notes || ''}\nPayment: ${dto.note}`.trim() : order.notes,
      },
      include: ORDER_INCLUDE,
    });

    // Create audit log entry following the same pattern as updateOrderStatus
    await this.prisma.orderStatusLog.create({
      data: {
        orderId,
        fromStatus: `PAYMENT:${order.paymentStatus}`,
        toStatus: `PAYMENT:${dto.paymentStatus}`,
        changedBy: changedBy || null,
        note: dto.note || null,
      },
    });

    // P-001: Finalize sale if payment marked as PAID (cash-on-delivery)
    if (dto.paymentStatus === 'PAID') {
      try {
        await this.paymentsService.finalizeSaleAfterPayment(orderId);
      } catch (error) {
        this.logger.error(
          `finalizeSaleAfterPayment failed for order ${orderId}: ${(error as Error).message}`,
        );
      }
    }

    // P-002: Notify user on payment status change
    await this.sendPaymentNotification(
      order.userId,
      orderId,
      order.orderNumber,
      order.paymentStatus as PaymentStatus,
      dto.paymentStatus as PaymentStatus,
    );

    this.logger.log({
      orderId,
      from: order.paymentStatus,
      to: dto.paymentStatus,
      changedBy,
      action: 'order.payment-status.updated',
    });

    return updated;
  }

  async findMyOrders(userId: string | null, query: OrderHistoryQueryDto, guestSessionId?: string) {
    // FIX-2: anonymous callers must never hit the DB with a null owner filter
    // (Prisma `{ userId: null }` matches EVERY guest order — PII leak).
    this.assertOwnerContext(userId, guestSessionId);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (guestSessionId) {
      where.guestSessionId = guestSessionId;
    } else if (userId) {
      where.userId = userId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    const formatted = items.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      shippingCharge: Number(order.shippingCharge),
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      items: order.items.map((item) => ({
        id: item.id,
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }));

    return {
      items: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMyOrder(userId: string | null, orderId: string, guestSessionId?: string) {
    // FIX-2: reject anonymous requests before querying. Without this, a guest
    // order (userId IS NULL) passes the old `order.userId !== userId` check
    // because both sides are null.
    this.assertOwnerContext(userId, guestSessionId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        ...ORDER_INCLUDE,
        invoices: {
          where: { type: 'INVOICE' },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertOrderOwnership(order, userId, guestSessionId);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      shippingCharge: Number(order.shippingCharge),
      taxAmount: Number(order.taxAmount),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      invoiceGenerated: order.invoices.length > 0,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      items: order.items.map((item) => ({
        id: item.id,
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        type: item.type,
      })),
    };
  }

  async repurchaseOrder(userId: string | null, orderId: string, guestSessionId?: string) {
    this.assertOwnerContext(userId, guestSessionId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, isActive: true } },
            variant: { select: { id: true, isActive: true, deletedAt: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertOrderOwnership(order, userId, guestSessionId);

    const itemsAdded: number[] = [];
    const unavailableDetails: Array<{ productName: string; reason: string }> = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.product.isActive) {
          unavailableDetails.push({
            productName: item.product.name,
            reason: 'product_discontinued',
          });
          continue;
        }

        if (item.variant && (!item.variant.isActive || item.variant.deletedAt)) {
          unavailableDetails.push({
            productName: item.product.name,
            reason: 'variant_unavailable',
          });
          continue;
        }

        if (guestSessionId) {
          const existingItem = await tx.guestCartItem.findFirst({
            where: {
              guestSessionId,
              variantId: item.variantId,
              type: item.type,
            },
          });

          if (existingItem) {
            await tx.guestCartItem.update({
              where: { id: existingItem.id },
              data: { quantity: existingItem.quantity + item.quantity },
            });
          } else {
            await tx.guestCartItem.create({
              data: {
                guestSessionId,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                type: item.type,
              },
            });
          }
        } else {
          if (!userId) {
            throw new UnauthorizedException('Authentication required');
          }
          let cart = await tx.cart.findUnique({ where: { userId } });
          if (!cart) {
            cart = await tx.cart.create({ data: { userId } });
          }

          const existingItem = await tx.cartItem.findFirst({
            where: {
              cartId: cart.id,
              variantId: item.variantId,
              type: item.type,
            },
          });

          if (existingItem) {
            await tx.cartItem.update({
              where: { id: existingItem.id },
              data: { quantity: existingItem.quantity + item.quantity },
            });
          } else {
            await tx.cartItem.create({
              data: {
                cartId: cart.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                type: item.type,
              },
            });
          }
        }
        itemsAdded.push(item.quantity);
      }
    });

    // Fetch updated cart (or guest cart items for guest)
    let cartResult: Record<string, unknown> | null = null;
    if (guestSessionId) {
      const updatedGuestItems = await this.prisma.guestCartItem.findMany({
        where: { guestSessionId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
              basePrice: true,
              salePrice: true,
            },
          },
          variant: { select: { id: true, size: true, color: true, sku: true, salePrice: true } },
        },
      });
      cartResult = {
        items: updatedGuestItems,
        guestSessionId,
      };
    } else {
      if (!userId) {
        throw new UnauthorizedException('Authentication required');
      }
      const updatedCart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                  basePrice: true,
                  salePrice: true,
                },
              },
              variant: {
                select: { id: true, size: true, color: true, sku: true, salePrice: true },
              },
            },
          },
        },
      });
      cartResult = updatedCart;
    }

    const totalAdded = itemsAdded.reduce((sum, qty) => sum + qty, 0);

    return {
      itemsAdded: totalAdded,
      unavailableItems: unavailableDetails.length,
      unavailableDetails,
      cart: cartResult,
    };
  }

  async guestCheckout(dto: GuestCheckoutDto) {
    const guestUser = await this.prisma.user.findUnique({
      where: { id: dto.guestId },
    });

    if (!guestUser || !guestUser.isGuest) {
      throw new NotFoundException('Guest user not found');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    let storeId = dto.storeId;
    if (!storeId) {
      const defaultStore = await this.prisma.storeLocation.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!defaultStore) {
        throw new BadRequestException('No active store found. Please contact support.');
      }
      storeId = defaultStore.id;
    }

    const orderNumber = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;
    let subtotal = 0;
    let totalTaxAmount = 0;

    const orderItemsData: Array<{
      productId: string;
      variantId: string | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      type: string;
      taxRate: Prisma.Decimal;
      cgstAmount: Prisma.Decimal;
      sgstAmount: Prisma.Decimal;
      igstAmount: Prisma.Decimal;
      hsnCode: string | null;
    }> = [];

    const variantIds = dto.items.map((item) => item.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: { id: true, name: true, isActive: true, basePrice: true, salePrice: true },
        },
      },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const inventoryDecrementMap = new Map<string, number>();

    for (const item of dto.items) {
      const variant = variantMap.get(item.variantId);

      if (!variant || !variant.isActive || variant.deletedAt) {
        throw new BadRequestException(`Variant ${item.variantId} is not available`);
      }

      if (!variant.product.isActive) {
        throw new BadRequestException(`Product ${variant.product.name} is not active`);
      }

      const unitPrice = variant.salePrice || variant.product.salePrice || variant.product.basePrice;
      const totalPrice = unitPrice.mul(item.quantity);
      subtotal += Number(totalPrice);

      // Calculate tax for this item
      const interState = isInterStateShipping();
      const tax = calculateTax(Number(unitPrice), item.quantity, interState);

      totalTaxAmount += tax.totalTax;

      orderItemsData.push({
        productId: variant.product.id,
        variantId: variant.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        subtotal: totalPrice,
        type: item.type || 'sale',
        taxRate: new Prisma.Decimal(tax.taxRate),
        cgstAmount: new Prisma.Decimal(tax.cgstAmount),
        sgstAmount: new Prisma.Decimal(tax.sgstAmount),
        igstAmount: new Prisma.Decimal(tax.igstAmount),
        hsnCode: null,
      });

      const currentQty = inventoryDecrementMap.get(item.variantId) ?? 0;
      inventoryDecrementMap.set(item.variantId, currentQty + item.quantity);
    }

    // Apply coupon if provided
    let discountAmount = 0;
    let appliedCouponId: string | null = null;

    if (dto.couponCode) {
      try {
        const couponResult = await this.applyCouponToGuestCheckout(dto.couponCode, subtotal);
        discountAmount = couponResult.discountAmount;
        appliedCouponId = couponResult.couponId;
      } catch (error) {
        this.logger.warn(
          { couponCode: dto.couponCode, error: (error as Error).message },
          'Coupon validation failed during guest checkout, proceeding without discount',
        );
      }
    }

    const taxAmount = Math.round(totalTaxAmount * 100) / 100;
    const totalAmount = subtotal + taxAmount - discountAmount;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: dto.guestId,
          totalAmount,
          subtotal,
          taxAmount,
          discountAmount,
          ...(appliedCouponId ? { couponId: appliedCouponId } : {}),
          shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
          paymentMethod: dto.paymentMethod,
          channel: 'online',
          storeId,
          items: {
            create: orderItemsData,
          },
        },
        include: ORDER_INCLUDE,
      });

      await tx.user.update({
        where: { id: dto.guestId },
        data: { email: dto.email },
      });

      const variantIds = Array.from(inventoryDecrementMap.keys()).sort();
      for (const variantId of variantIds) {
        const qty = inventoryDecrementMap.get(variantId) ?? 0;

        const locked = await tx.$queryRaw<Array<InventorySummaryLock>>`
          SELECT * FROM inventory_summary
          WHERE "variantId" = ${variantId} AND "storeId" = ${storeId}
          FOR UPDATE;
        `;

        const summary = locked[0];

        if (!summary || summary.quantityAvailable < qty) {
          throw new ConflictException({
            message:
              'This item is no longer available in the requested quantity. Please remove it from your cart and try again.',
            itemUnavailable: true,
          });
        }

        await tx.inventorySummary.update({
          where: {
            variantId_storeId: {
              variantId,
              storeId: summary.storeId,
            },
          },
          data: {
            quantityAvailable: { decrement: qty },
            quantityReserved: { increment: qty },
          },
        });

        await tx.stockMovement.create({
          data: {
            variantId,
            storeId,
            quantityChange: -qty,
            type: 'RESERVATION',
            reference: `order:${created.id}`,
            notes: `Reserved ${qty} item(s) for guest order ${created.orderNumber}`,
          },
        });
      }

      return created;
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        id: item.id,
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      shippingAddress: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      createdAt: order.createdAt,
    };
  }

  // ──────────────────────────────────────────────
  //  REQ-BE-001 / REQ-BE-002: Customer cancellation
  // ──────────────────────────────────────────────

  /**
   * Allowed status transitions for the customer-facing cancel endpoint.
   * Admin override is handled separately so the controller can document
   * the rule clearly to operators (vs. inlining it in the service).
   */
  static readonly CUSTOMER_CANCELLABLE_STATUSES: ReadonlyArray<OrderStatus> = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
  ];
  // REQ-BE-001: the admin override is documented in the research report
  // and the CancelOrderDto description but the live OrderStatus enum
  // does not currently include a 'PROCESSING' value. We use a string
  // literal so the override still compiles if/when PROCESSING is added;
  // the runtime check will simply never match a missing value.
  static readonly ADMIN_CANCELLABLE_STATUSES: ReadonlyArray<OrderStatus> = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    'PROCESSING' as OrderStatus,
  ];

  /**
   * REQ-BE-001 / REQ-BE-002: Cancel an order.
   *
   * Rules:
   * - Status must be PENDING or CONFIRMED for the customer.
   * - Admin (req.user.role === ADMIN) may also cancel PROCESSING.
   * - SHIPPED / DELIVERED / already-CANCELLED orders return 400.
   * - Caller must own the order OR be an admin (assertOrderOwnership +
   *   admin bypass).
   *
   * Side effects, all wrapped in a single Prisma transaction:
   * - Order.status → CANCELLED, cancelledAt / cancelledBy /
   *   cancellationReason fields populated.
   * - OrderStatusLog entry with actorType and metadata.
   * - InventorySummary restored for each non-rental OrderItem variant
   *   (rental items release the InventoryUnit + cancel RentalBooking
   *   instead).
   * - If paymentStatus = PAID, a Refund row is created in INITIATED state
   *   and PaymentsService.refund is called outside the transaction.
   * - After commit, an OrderCancelledEvent is emitted for downstream
   *   listeners (notifications, analytics).
   */
  async cancel(
    orderId: string,
    dto: CancelOrderDto,
    userId: string | null,
    guestSessionId: string | null,
    isAdmin: boolean,
  ): Promise<{
    id: string;
    status: 'CANCELLED';
    refundId: string | null;
    cancelledAt: string;
    orderNumber: string;
  }> {
    // Coerce `string | null` -> `string | undefined` for the legacy
    // ownership helpers. The helpers accept null as "absent" anyway
    // (their !userId && !guestSessionId guard handles both), so the
    // null/undefined distinction carries no semantic weight.
    this.assertOwnerContext(userId ?? undefined, guestSessionId ?? undefined);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            quantity: true,
            type: true,
            unitPrice: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Ownership check — admin bypass is applied here so non-admin callers
    // still get the existing IDOR-safe assertOrderOwnership behaviour.
    if (isAdmin) {
      // Admin can act on any order regardless of userId / guestSessionId.
      this.logger.log({
        orderId,
        adminId: userId,
        action: 'order.cancel.admin-override',
      });
    } else {
      this.assertOrderOwnership(order, userId ?? undefined, guestSessionId ?? undefined);
    }

    const cancellableStatuses = isAdmin
      ? OrdersService.ADMIN_CANCELLABLE_STATUSES
      : OrdersService.CUSTOMER_CANCELLABLE_STATUSES;

    if (!cancellableStatuses.includes(order.status)) {
      // SHIPPED / DELIVERED / OUT_FOR_DELIVERY / RETURNED / CANCELLED /
      // PARTIALLY_CANCELLED — all rejected with a 400.
      throw new BadRequestException(
        `Order in status ${order.status} cannot be cancelled (cancellable: ${cancellableStatuses.join(', ')})`,
      );
    }

    // Resolve a storeId for inventory restoration. Fall back to first
    // active store when the order has none (defensive — orders should
    // always have a storeId in practice).
    let storeId = order.storeId;
    if (!storeId) {
      const defaultStore = await this.prisma.storeLocation.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!defaultStore) {
        throw new BadRequestException('No active store found. Please contact support.');
      }
      storeId = defaultStore.id;
    }

    // Snapshot items + rental bookings for the event payload and for the
    // post-commit refund flow. We also need the rental booking ids up front
    // so we can cancel them inside the same transaction.
    const itemSnapshots: OrderCancelledItem[] = order.items.map((item) => ({
      orderItemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPricePaise: Number(item.unitPrice) * 100,
      isRental: item.type === 'rent',
    }));
    const rentalOrderItemIds = itemSnapshots
      .filter((item) => item.isRental)
      .map((item) => item.orderItemId);

    const rentalBookings = rentalOrderItemIds.length
      ? await this.prisma.rentalBooking.findMany({
          where: { orderItemId: { in: rentalOrderItemIds } },
          select: { id: true, unitId: true, storeId: true, status: true },
        })
      : [];

    const refundShouldFire = order.paymentStatus === PaymentStatus.PAID;

    // Single transaction: status update, audit log, inventory restore, rental
    // release. Refund is created here as INITIATED (so the row exists even
    // if the Razorpay call fails) but the Razorpay API call happens outside
    // the transaction to avoid holding a long lock.
    const { cancelledOrder, refundId } = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: userId ?? null,
          cancellationReason: dto.reason,
        },
        select: {
          id: true,
          orderNumber: true,
          cancelledAt: true,
        },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          changedBy: userId ?? null,
          note: dto.notes ?? null,
          actorType: isAdmin ? ActorType.ADMIN : ActorType.USER,
          reason: dto.reason,
          metadata: {
            source: isAdmin ? 'admin-override' : 'customer-cancel',
            adminOverride: isAdmin,
            notes: dto.notes ?? null,
          },
        },
      });

      // Restore non-rental inventory.
      for (const item of order.items) {
        if (!item.variantId || item.type === 'rent') continue;

        const locked = await tx.$queryRaw<Array<InventorySummaryLock>>`
          SELECT * FROM inventory_summary
          WHERE "variantId" = ${item.variantId} AND "storeId" = ${storeId}
          FOR UPDATE;
        `;
        const summary = locked[0];
        if (!summary) continue;

        // Decrement the side that originally consumed the unit
        // (reserved during checkout, sold at sale finalization).
        const decrementField =
          summary.quantitySold >= item.quantity
            ? { quantitySold: { decrement: item.quantity } }
            : { quantityReserved: { decrement: item.quantity } };

        await tx.inventorySummary.update({
          where: {
            variantId_storeId: { variantId: item.variantId, storeId: storeId! },
          },
          data: {
            quantityAvailable: { increment: item.quantity },
            ...decrementField,
          },
        });
      }

      // Release rental units + cancel any open rental bookings.
      for (const booking of rentalBookings) {
        if (booking.status === 'CLOSED' || booking.status === 'CANCELLED') continue;

        await tx.rentalBooking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        });
        await tx.inventoryUnit.update({
          where: { id: booking.unitId },
          data: { status: 'AVAILABLE' },
        });
      }

      // Create the Refund row up front (INITIATED) so the id is available
      // for the event payload. The actual Razorpay call is best-effort and
      // happens after commit so the transaction window stays small.
      let createdRefundId: string | null = null;
      if (refundShouldFire) {
        const payment = await tx.payment.findFirst({
          where: { orderId, status: PaymentStatus.PAID },
          orderBy: { createdAt: 'desc' },
        });
        if (payment?.razorpayPaymentId) {
          // Reserve a placeholder razorpayRefundId; we'll overwrite with
          // the real id after the Razorpay API call. Using a UUID v4 keeps
          // it unique even if the API call fails.
          const placeholder = `pending-${uuidv4()}`;
          const refund = await tx.refund.create({
            data: {
              orderId,
              amount: order.totalAmount,
              razorpayRefundId: placeholder,
              status: 'INITIATED',
              reason: `order-cancel:${dto.reason}`,
            },
          });
          createdRefundId = refund.id;
        }
      }

      return { cancelledOrder: cancelled, refundId: createdRefundId };
    });

    // After the DB transaction: kick off the actual Razorpay refund (best-
    // effort). Failure is logged but does not roll back the cancellation
    // — the Refund row stays in INITIATED for retry via the webhook path.
    const finalRefundId: string | null = refundId;
    if (refundShouldFire) {
      try {
        const payment = await this.prisma.payment.findFirst({
          where: { orderId, status: PaymentStatus.PAID },
          orderBy: { createdAt: 'desc' },
        });
        if (payment && refundId) {
          const refundResult = await this.paymentsService.refund(payment.id);
          const refundData = refundResult as { id?: string };
          if (refundData.id) {
            await this.prisma.refund.update({
              where: { id: refundId },
              data: { razorpayRefundId: refundData.id, status: 'INITIATED' },
            });
          }
        }
      } catch (error) {
        this.logger.error(
          {
            orderId,
            refundId,
            error: (error as Error).message,
            action: 'order.cancel.refund.failed',
          },
          'Razorpay refund call failed during order cancellation; refund row remains INITIATED for retry',
        );
        // Intentionally do not throw — the cancellation is committed, the
        // Refund row is durable, and the webhook will reconcile when the
        // gateway processes the refund asynchronously.
      }
    }

    // REQ-BE-002: emit the OrderCancelledEvent for downstream listeners.
    // The payload is fully resolved at this point so listeners never need
    // to re-read the DB for the core fields.
    const event = new OrderCancelledEvent({
      orderId: cancelledOrder.id,
      orderNumber: cancelledOrder.orderNumber,
      userId: order.userId,
      guestSessionId: order.guestSessionId,
      refundId: finalRefundId,
      cancelledBy: isAdmin ? 'ADMIN' : 'USER',
      actorId: userId,
      reason: dto.reason,
      totalAmountPaise: Number(order.totalAmount) * 100,
      paymentStatus: order.paymentStatus,
      items: itemSnapshots,
      cancelledAt: cancelledOrder.cancelledAt ?? new Date(),
    });
    this.eventEmitter.emit(OrderCancelledEvent.eventName, event);

    this.logger.log({
      orderId,
      orderNumber: cancelledOrder.orderNumber,
      userId: order.userId,
      refundId: finalRefundId,
      reason: dto.reason,
      action: 'order.cancelled',
    });

    return {
      id: cancelledOrder.id,
      status: 'CANCELLED',
      refundId: finalRefundId,
      cancelledAt: (cancelledOrder.cancelledAt ?? new Date()).toISOString(),
      orderNumber: cancelledOrder.orderNumber,
    };
  }

  async initiateReturn(
    userId: string | null,
    orderId: string,
    dto: InitiateReturnDto,
    guestSessionId?: string,
  ) {
    this.assertOwnerContext(userId, guestSessionId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: { id: { in: dto.itemIds } },
          select: { id: true, productId: true, variantId: true, quantity: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertOrderOwnership(order, userId, guestSessionId);

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Only delivered orders can be returned');
    }

    const returnPolicy = await this.prisma.returnPolicy.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    const returnWindowDays = returnPolicy?.windowDays ?? 7;
    const deliveredAt = order.deliveredAt ?? order.updatedAt;
    const daysSinceDelivery = Math.floor(
      (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceDelivery > returnWindowDays) {
      throw new BadRequestException(
        `Return window of ${returnWindowDays} days has expired (${daysSinceDelivery} days since delivery)`,
      );
    }

    const allItemsReturned = dto.itemIds.length === order.items.length;

    if (!allItemsReturned) {
      this.logger.log(
        `Partial return for order ${orderId}: ${dto.itemIds.length} of ${order.items.length} items`,
      );
    }

    const newStatus: OrderStatus = allItemsReturned ? 'RETURNED' : 'PARTIALLY_CANCELLED';

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    return {
      success: true,
      message: allItemsReturned
        ? `Return initiated for all ${dto.itemIds.length} item(s)`
        : `Partial return initiated for ${dto.itemIds.length} of ${order.items.length} item(s)`,
      returnWindow: returnWindowDays,
      daysSinceDelivery,
      isPartialReturn: !allItemsReturned,
    };
  }

  async applyCoupon(userId: string | null, dto: ApplyCouponDto, guestSessionId?: string) {
    // FIX-2: anonymous coupon validation must not be possible.
    this.assertOwnerContext(userId, guestSessionId);

    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();

        const coupon = await tx.coupon.findUnique({
          where: { code: dto.code },
        });

        if (!coupon) {
          throw new NotFoundException('Coupon not found');
        }

        if (!coupon.isActive) {
          throw new BadRequestException('This coupon is no longer active');
        }

        if (now < coupon.validFrom) {
          throw new BadRequestException('This coupon is not yet valid');
        }

        if (now > coupon.validUntil) {
          throw new BadRequestException('This coupon has expired');
        }

        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
          throw new ConflictException('This coupon has reached its usage limit');
        }

        // For guest users, skip per-user usage limit (guests don't have userId)
        if (!guestSessionId) {
          if (!userId) {
            throw new UnauthorizedException('Authentication required');
          }
          const userUsageCount = await tx.couponUsage.count({
            where: { couponId: coupon.id, userId },
          });

          if (userUsageCount >= coupon.perUserLimit) {
            throw new ConflictException(
              'You have already used this coupon the maximum number of times',
            );
          }
        }

        if (Number(dto.cartTotal) < Number(coupon.minCartValue)) {
          throw new BadRequestException(
            `Minimum cart value of ₹${Number(coupon.minCartValue)} required for this coupon`,
          );
        }

        let discountAmount: number;
        if (coupon.type === 'PERCENT') {
          discountAmount = (Number(dto.cartTotal) * Number(coupon.value)) / 100;
          if (coupon.maxDiscount !== null && discountAmount > Number(coupon.maxDiscount)) {
            discountAmount = Number(coupon.maxDiscount);
          }
        } else {
          discountAmount = Number(coupon.value);
        }

        discountAmount = Math.min(discountAmount, Number(dto.cartTotal));

        const finalTotal = Number(dto.cartTotal) - discountAmount;

        return {
          success: true,
          discountAmount: Math.round(discountAmount * 100) / 100,
          finalTotal: Math.round(finalTotal * 100) / 100,
          coupon: {
            code: coupon.code,
            type: coupon.type,
            value: Number(coupon.value),
            description: coupon.description,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Validates a coupon code and returns discount details for guest checkout.
   * Mirrors the logic in applyCoupon() but operates without userId/guestSessionId context.
   */
  private async applyCouponToGuestCheckout(
    code: string,
    cartTotal: number,
  ): Promise<{ discountAmount: number; finalTotal: number; couponId: string }> {
    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();

        const coupon = await tx.coupon.findUnique({ where: { code } });

        if (!coupon) {
          throw new NotFoundException('Coupon not found');
        }
        if (!coupon.isActive) {
          throw new BadRequestException('This coupon is no longer active');
        }
        if (now < coupon.validFrom) {
          throw new BadRequestException('This coupon is not yet valid');
        }
        if (now > coupon.validUntil) {
          throw new BadRequestException('This coupon has expired');
        }
        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
          throw new ConflictException('This coupon has reached its usage limit');
        }
        // Skip per-user usage check for guest checkout (no user context)
        if (Number(cartTotal) < Number(coupon.minCartValue)) {
          throw new BadRequestException(
            `Minimum cart value of ₹${Number(coupon.minCartValue)} required for this coupon`,
          );
        }

        // Calculate discount
        let discountAmount: number;
        if (coupon.type === 'PERCENT') {
          discountAmount = (Number(cartTotal) * Number(coupon.value)) / 100;
          if (coupon.maxDiscount !== null && discountAmount > Number(coupon.maxDiscount)) {
            discountAmount = Number(coupon.maxDiscount);
          }
        } else {
          discountAmount = Number(coupon.value);
        }
        discountAmount = Math.min(discountAmount, Number(cartTotal));

        const finalTotal = Number(cartTotal) - discountAmount;

        return {
          discountAmount: Math.round(discountAmount * 100) / 100,
          finalTotal: Math.round(finalTotal * 100) / 100,
          couponId: coupon.id,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async getTracking(userId: string | null, orderId: string, guestSessionId?: string) {
    this.assertOwnerContext(userId, guestSessionId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, guestSessionId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertOrderOwnership(order, userId, guestSessionId);

    const courierReceipts = await this.prisma.courierReceipt.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    if (courierReceipts.length === 0) {
      return {
        trackingAvailable: false,
        message: 'No tracking information available yet',
        shipments: [],
      };
    }

    return {
      trackingAvailable: true,
      shipments: courierReceipts.map((receipt) => ({
        courierName: receipt.courierName,
        awbNumber: receipt.awbNumber,
        trackingUrl: receipt.trackingUrl,
        status: receipt.deliveredAt ? 'DELIVERED' : receipt.shippedAt ? 'SHIPPED' : 'PENDING',
        shippedAt: receipt.shippedAt?.toISOString() ?? null,
        deliveredAt: receipt.deliveredAt?.toISOString() ?? null,
      })),
    };
  }

  async getInvoicePdf(orderId: string, userId: string | null, guestSessionId?: string) {
    this.assertOwnerContext(userId, guestSessionId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        invoices: {
          where: { type: 'INVOICE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertOrderOwnership(order, userId, guestSessionId);

    // If payment is PAID but no invoice exists, try to finalize sale + generate on the fly
    const existingInvoice = order.invoices[0];
    let invoice = existingInvoice;
    if (!invoice && order.paymentStatus === 'PAID') {
      try {
        await this.paymentsService.finalizeSaleAfterPayment(orderId);
        const refreshedOrder = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            invoices: {
              where: { type: 'INVOICE' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });
        if (refreshedOrder?.invoices[0]) {
          invoice = refreshedOrder.invoices[0];
        }
      } catch (error) {
        this.logger.warn(
          `Failed to auto-generate invoice for order ${orderId} during download: ${(error as Error).message}`,
        );
      }
    }

    if (!invoice) {
      throw new NotFoundException('No invoice found for this order');
    }

    let buffer: Buffer | null = null;
    try {
      let key = invoice.pdfStorageKey;
      if (!key) {
        const urlParts = invoice.pdfUrl.split('/');
        key = urlParts.slice(urlParts.indexOf('invoices')).join('/');
      }
      buffer = await this.storage.download(key);
    } catch {
      this.logger.warn(
        `Could not download invoice ${invoice.id} from storage, trying URL fallback`,
      );
    }

    if (!buffer) {
      buffer = await this.storage.download(invoice.pdfUrl);
    }

    if (!buffer) {
      throw new NotFoundException('Invoice PDF file not found in storage');
    }

    const filename = `invoice-${invoice.invoiceNumber}.pdf`;

    return { buffer, filename };
  }

  private async sendPaymentNotification(
    userId: string | null,
    orderId: string,
    orderNumber: string,
    fromStatus: PaymentStatus,
    toStatus: PaymentStatus,
  ): Promise<void> {
    if (!userId || fromStatus === toStatus) return;

    const paymentMessages: Record<string, string> = {
      PAID: `Payment for order #${orderNumber} has been received!`,
      FAILED: `Payment for order #${orderNumber} has failed. Please contact support.`,
    };

    const message = paymentMessages[toStatus];
    if (!message) return;

    try {
      this.notificationsGateway.sendOrderUpdate(userId, {
        orderId,
        status: `PAYMENT:${toStatus}`,
        message,
      });
    } catch (error) {
      this.logger.warn(
        `WebSocket payment notification failed for order ${orderId}: ${(error as Error).message}`,
      );
    }

    try {
      await this.notificationsService.create({
        userId,
        channel: NotificationChannel.IN_APP,
        title: 'Payment Update',
        body: message,
        dataJson: { orderId, paymentStatus: toStatus, orderNumber },
      });
    } catch (error) {
      this.logger.warn(
        `Payment notification creation failed for order ${orderId}: ${(error as Error).message}`,
      );
    }
  }

  private async sendOrderNotifications(
    userId: string | null,
    orderId: string,
    newStatus: string,
    orderNumber: string,
  ): Promise<void> {
    const statusMessages: Record<string, string> = {
      CONFIRMED: `Your order #${orderNumber} has been confirmed!`,
      PACKED: `Your order #${orderNumber} is being packed.`,
      SHIPPED: `Your order #${orderNumber} has been shipped!`,
      OUT_FOR_DELIVERY: `Your order #${orderNumber} is out for delivery!`,
      DELIVERED: `Your order #${orderNumber} has been delivered!`,
      CANCELLED: `Your order #${orderNumber} has been cancelled.`,
      RETURNED: `Return initiated for order #${orderNumber}.`,
    };

    const message = statusMessages[newStatus];
    if (!message || !userId) {
      return;
    }

    try {
      this.notificationsGateway.sendOrderUpdate(userId, {
        orderId,
        status: newStatus,
        message,
      });
    } catch (error) {
      this.logger.warn(
        `WebSocket notification failed for order ${orderId}: ${(error as Error).message}`,
      );
    }

    try {
      await this.notificationsService.create({
        userId,
        channel: NotificationChannel.IN_APP,
        title: 'Order Update',
        body: message,
        dataJson: { orderId, status: newStatus, orderNumber },
      });
    } catch (error) {
      this.logger.warn(
        `Notification creation failed for order ${orderId}: ${(error as Error).message}`,
      );
    }
  }
}
