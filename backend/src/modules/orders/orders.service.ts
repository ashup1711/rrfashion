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
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '../notifications/dto/create-notification.dto';
import { PaymentsService } from '../payments/payments.service';
import { OrderHistoryQueryDto } from './dto/order-history-query.dto';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { InitiateReturnDto } from './dto/initiate-return.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { OrderStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

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
    private readonly config: ConfigService,
  ) {}

  async create(userId: string, dto: CreateOrderDto, guestSessionId?: string) {
    const customerLabel = guestSessionId ? 'guest' : 'customer';
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

    // Build order items data with real prices from DB
    let subtotal = 0;
    const orderItemsData: Array<{
      productId: string;
      variantId: string | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      type: string;
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

      orderItemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        subtotal: totalPrice,
        type: item.type || 'sale',
      });
    }

    const totalAmount = subtotal;

    // Create order + decrement inventory in a Prisma $transaction with FOR UPDATE locks
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          ...(guestSessionId ? { guestSessionId } : { userId }),
          totalAmount,
          subtotal,
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
          throw new ConflictException(
            `Item is no longer available in the requested quantity. variantId=${variantId}`,
          );
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
            quantitySold: { increment: qty },
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
    try {
      razorpayOrder = (await this.paymentsService.createOrder({
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        notes: { order_type: 'sale' },
      })) as Record<string, unknown>;
    } catch (error) {
      this.logger.error(
        { orderId: order.id, error: (error as Error).message },
        'Failed to create Razorpay order',
      );
    }

    const razorpayKeyId = this.config.get<string>('RAZORPAY_KEY_ID') || '';

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
            await tx.inventorySummary.update({
              where: {
                variantId_storeId: {
                  variantId: item.variantId,
                  storeId,
                },
              },
              data: {
                quantityAvailable: { increment: item.quantity },
                quantitySold: { decrement: item.quantity },
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

  async findMyOrders(userId: string, query: OrderHistoryQueryDto, guestSessionId?: string) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (guestSessionId) {
      where.guestSessionId = guestSessionId;
    } else {
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

  async findMyOrder(userId: string, orderId: string, guestSessionId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (guestSessionId) {
      if (order.guestSessionId !== guestSessionId) {
        throw new UnauthorizedException('This order does not belong to you');
      }
    } else {
      if (order.userId !== userId) {
        throw new UnauthorizedException('This order does not belong to you');
      }
    }

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

  async repurchaseOrder(userId: string, orderId: string, guestSessionId?: string) {
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

    if (guestSessionId) {
      if (order.guestSessionId !== guestSessionId) {
        throw new UnauthorizedException('This order does not belong to you');
      }
    } else {
      if (order.userId !== userId) {
        throw new UnauthorizedException('This order does not belong to you');
      }
    }

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

    const orderItemsData: Array<{
      productId: string;
      variantId: string | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      type: string;
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

      orderItemsData.push({
        productId: variant.product.id,
        variantId: variant.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        subtotal: totalPrice,
        type: item.type || 'sale',
      });

      const currentQty = inventoryDecrementMap.get(item.variantId) ?? 0;
      inventoryDecrementMap.set(item.variantId, currentQty + item.quantity);
    }

    const totalAmount = subtotal;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: dto.guestId,
          totalAmount,
          subtotal,
          shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
          paymentMethod: dto.paymentMethod,
          channel: 'online',
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
          throw new ConflictException(
            `Item is no longer available in the requested quantity. variantId=${variantId}`,
          );
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
            quantitySold: { increment: qty },
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

  async initiateReturn(
    userId: string,
    orderId: string,
    dto: InitiateReturnDto,
    guestSessionId?: string,
  ) {
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

    if (guestSessionId) {
      if (order.guestSessionId !== guestSessionId) {
        throw new UnauthorizedException('This order does not belong to you');
      }
    } else {
      if (order.userId !== userId) {
        throw new UnauthorizedException('This order does not belong to you');
      }
    }

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

  async applyCoupon(userId: string, dto: ApplyCouponDto, guestSessionId?: string) {
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

  async getTracking(userId: string, orderId: string, guestSessionId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, guestSessionId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (guestSessionId) {
      if (order.guestSessionId !== guestSessionId) {
        throw new UnauthorizedException('This order does not belong to you');
      }
    } else {
      if (order.userId !== userId) {
        throw new UnauthorizedException('This order does not belong to you');
      }
    }

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

  async getInvoicePdf(orderId: string, userId: string, guestSessionId?: string) {
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

    if (guestSessionId) {
      if (order.guestSessionId !== guestSessionId) {
        throw new UnauthorizedException('This order does not belong to you');
      }
    } else {
      if (order.userId !== userId) {
        throw new UnauthorizedException('This order does not belong to you');
      }
    }

    const invoice = order.invoices[0];
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
