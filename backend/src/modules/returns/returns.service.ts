/**
 * REQ-BE-006 / REQ-BE-007: Return-request lifecycle.
 *
 *   customer creates ─► admin approves ─► refunds queued
 *                   └► admin rejects
 *
 * Persistence: each return is a `ReturnRequest` row with one
 * `ReturnRequestItem` per OrderItem line. Refunds are created on approve
 * (via PaymentsService.refund) and the `Refund.razorpayRefundId` row
 * is the idempotency key for webhook reconciliation.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import {
  ReturnStatus,
  ReturnItemStatus,
  ReturnReason,
  ActorType,
  PaymentStatus,
} from '@prisma/client';
import { CreateReturnRequestDto, ReturnItemDto } from './dto/create-return-request.dto';
import { ApproveReturnDto, RejectReturnDto } from './dto/admin-return-action.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * REQ-BE-006: create a return request for a delivered order.
   * Ownership-checked against the order's userId / guestSessionId.
   */
  async create(
    orderId: string,
    userId: string | null,
    guestSessionId: string | null,
    dto: CreateReturnRequestDto,
  ) {
    if (!userId && !guestSessionId) {
      throw new ForbiddenException('Authentication required');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: { id: true, productId: true, variantId: true, quantity: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const ownsOrder = guestSessionId
      ? order.guestSessionId === guestSessionId
      : !!userId && order.userId === userId;
    if (!ownsOrder) {
      throw new ForbiddenException('This order does not belong to you');
    }

    // Only delivered orders can be returned.
    if (order.status !== 'DELIVERED' && order.status !== 'RETURNED') {
      throw new BadRequestException(
        `Only delivered orders can be returned (current status: ${order.status})`,
      );
    }

    // Validate each item exists in the order and that quantities do not
    // exceed the originally-purchased quantity.
    const orderItemMap = new Map(order.items.map((i) => [i.id, i]));
    for (const requested of dto.items) {
      const lineItem = orderItemMap.get(requested.orderItemId);
      if (!lineItem) {
        throw new BadRequestException(
          `OrderItem ${requested.orderItemId} does not belong to this order`,
        );
      }
      if (requested.quantity > lineItem.quantity) {
        throw new BadRequestException(
          `Return quantity ${requested.quantity} exceeds purchased quantity ${lineItem.quantity} for item ${requested.orderItemId}`,
        );
      }
    }

    const returnRequest = await this.prisma.$transaction(async (tx) => {
      const created = await tx.returnRequest.create({
        data: {
          orderId,
          status: ReturnStatus.PENDING,
          items: {
            create: dto.items.map((item: ReturnItemDto) => ({
              orderItemId: item.orderItemId,
              quantity: item.quantity,
              reason: item.reason as ReturnReason,
              photos: item.photos ?? [],
              notes: item.notes ?? null,
              status: ReturnItemStatus.PENDING,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: order.status,
          changedBy: userId ?? null,
          actorType: userId ? ActorType.USER : ActorType.GUEST,
          reason: ReturnReason.OTHER,
          metadata: {
            source: 'return.create',
            returnRequestId: created.id,
            itemCount: created.items.length,
          },
        },
      });

      return created;
    });

    this.logger.log({
      orderId,
      returnRequestId: returnRequest.id,
      itemCount: returnRequest.items.length,
      userId: order.userId,
      action: 'return.request.created',
    });

    return {
      returnRequest: {
        id: returnRequest.id,
        orderId: returnRequest.orderId,
        status: returnRequest.status,
        createdAt: returnRequest.createdAt,
        resolvedAt: returnRequest.resolvedAt,
        adminNotes: returnRequest.adminNotes,
      },
      items: returnRequest.items.map((it) => ({
        id: it.id,
        orderItemId: it.orderItemId,
        quantity: it.quantity,
        reason: it.reason,
        photos: it.photos,
        notes: it.notes,
        status: it.status,
        refundAmount: it.refundAmount ? Number(it.refundAmount) : null,
      })),
    };
  }

  /**
   * REQ-BE-007: admin approval. Triggers partial refunds per item.
   */
  async approve(returnRequestId: string, adminId: string, dto: ApproveReturnDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        items: {
          include: {
            orderItem: {
              select: {
                id: true,
                unitPrice: true,
                quantity: true,
                orderId: true,
              },
            },
          },
        },
        order: {
          select: { id: true, userId: true, totalAmount: true, paymentStatus: true },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnStatus.PENDING) {
      throw new ConflictException(
        `Return request is already in status ${returnRequest.status} and cannot be approved`,
      );
    }

    if (returnRequest.order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Cannot issue a refund for an order that has not been paid');
    }

    // Compute per-item refund amounts: unitPrice * quantity.
    const perItemAmounts = returnRequest.items.map((item) => ({
      itemId: item.id,
      orderItemId: item.orderItemId,
      amount: Number(item.orderItem.unitPrice) * item.quantity,
    }));

    let totalRefund = perItemAmounts.reduce((sum, i) => sum + i.amount, 0);
    if (dto.partialRefundAmount !== undefined && dto.partialRefundAmount < totalRefund) {
      // Scale every line item proportionally so the sum equals the cap.
      const factor = dto.partialRefundAmount / totalRefund;
      perItemAmounts.forEach((i) => {
        i.amount = Math.round(i.amount * factor * 100) / 100;
      });
      totalRefund = perItemAmounts.reduce((sum, i) => sum + i.amount, 0);
    }

    // Mark the request as approved + write the per-item refundAmount
    // snapshot. The actual Razorpay call and the Refund rows are
    // created after the transaction so a slow gateway does not lock the
    // orders table.
    await this.prisma.returnRequest.update({
      where: { id: returnRequestId },
      data: {
        status: ReturnStatus.APPROVED,
        resolvedAt: new Date(),
        adminNotes: dto.adminNotes ?? null,
        items: {
          update: perItemAmounts.map((line) => ({
            where: { id: line.itemId },
            data: {
              status: ReturnItemStatus.APPROVED,
              refundAmount: line.amount,
            },
          })),
        },
      },
    });

    // Best-effort refund initiation — one Refund row per item. The webhook
    // (REQ-BE-009) will flip each row to PROCESSED/FAILED when the gateway
    // confirms. We use a placeholder razorpayRefundId so the unique
    // constraint is satisfied even before the API responds; the real id
    // overwrites it on success.
    const refunds: Array<{ itemId: string; refundId: string; amount: number }> = [];
    for (const line of perItemAmounts) {
      if (line.amount <= 0) continue;
      const placeholder = `pending-${uuidv4()}`;
      const refund = await this.prisma.refund.create({
        data: {
          orderId: returnRequest.order.id,
          returnRequestId,
          amount: line.amount,
          razorpayRefundId: placeholder,
          status: 'INITIATED',
          reason: `return-approve:${returnRequestId}`,
        },
      });
      refunds.push({ itemId: line.itemId, refundId: refund.id, amount: line.amount });
    }

    // Fire one Razorpay refund per item. Errors are logged so the webhook
    // (REQ-BE-009) remains the source of truth for status transitions.
    const payment = await this.prisma.payment.findFirst({
      where: { orderId: returnRequest.order.id, status: PaymentStatus.PAID },
      orderBy: { createdAt: 'desc' },
    });
    if (payment) {
      for (const refund of refunds) {
        try {
          const refundResult = await this.paymentsService.refund(payment.id, refund.amount);
          const refundData = refundResult as { id?: string };
          if (refundData.id) {
            await this.prisma.refund.update({
              where: { id: refund.refundId },
              data: { razorpayRefundId: refundData.id },
            });
          }
        } catch (error) {
          this.logger.error(
            {
              refundId: refund.refundId,
              itemId: refund.itemId,
              error: (error as Error).message,
              action: 'return.approve.refund.failed',
            },
            'Razorpay refund failed during return approval — Refund row remains INITIATED for retry',
          );
        }
      }
    }

    this.logger.log({
      returnRequestId,
      adminId,
      totalRefund,
      refundCount: refunds.length,
      action: 'return.request.approved',
    });

    return {
      returnRequest: {
        id: returnRequestId,
        status: ReturnStatus.APPROVED,
        resolvedAt: new Date().toISOString(),
        adminNotes: dto.adminNotes ?? null,
      },
      refunds,
    };
  }

  /**
   * REQ-BE-007: admin rejection. Marks the request + items as REJECTED.
   */
  async reject(returnRequestId: string, adminId: string, dto: RejectReturnDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: { items: true },
    });
    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }
    if (returnRequest.status !== ReturnStatus.PENDING) {
      throw new ConflictException(
        `Return request is already in status ${returnRequest.status} and cannot be rejected`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          status: ReturnStatus.REJECTED,
          resolvedAt: new Date(),
          adminNotes: dto.adminNotes,
          items: {
            update: returnRequest.items.map((it) => ({
              where: { id: it.id },
              data: { status: ReturnItemStatus.REJECTED },
            })),
          },
        },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: updatedRequest.orderId,
          fromStatus: 'RETURN_REQUESTED',
          toStatus: 'RETURN_REJECTED',
          changedBy: adminId,
          actorType: ActorType.ADMIN,
          reason: ReturnReason.OTHER,
          metadata: {
            source: 'return.reject',
            returnRequestId,
            adminNotes: dto.adminNotes,
          },
        },
      });

      return updatedRequest;
    });

    this.logger.log({
      returnRequestId,
      adminId,
      action: 'return.request.rejected',
    });

    return {
      returnRequest: {
        id: updated.id,
        orderId: updated.orderId,
        status: updated.status,
        resolvedAt: updated.resolvedAt,
        adminNotes: updated.adminNotes,
      },
    };
  }

  /**
   * Returns-queue read for the admin UI.
   */
  async listAdmin(params: { page?: number; limit?: number; status?: ReturnStatus }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              userId: true,
              totalAmount: true,
              paymentStatus: true,
            },
          },
        },
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        order: r.order,
        status: r.status,
        adminNotes: r.adminNotes,
        resolvedAt: r.resolvedAt,
        createdAt: r.createdAt,
        itemCount: r.items.length,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
