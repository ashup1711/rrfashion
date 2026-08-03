/**
 * REQ-BE-008: Refund list endpoint service.
 *
 * Returns every Refund row attached to the order. Ownership-checked against
 * the order's userId / guestSessionId so a customer can only see their own
 * refunds. The list is intentionally sorted oldest-first so the timeline
 * UI renders INITIATED → PROCESSED / FAILED in order.
 */
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefundsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all refunds for an order. Returns [] when none exist (no 404
   * when the order is empty of refunds, only when the order itself is
   * missing).
   */
  async listForOrder(orderId: string, userId: string | null, guestSessionId: string | null) {
    if (!userId && !guestSessionId) {
      throw new ForbiddenException('Authentication required');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, guestSessionId: true },
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

    const refunds = await this.prisma.refund.findMany({
      where: { orderId },
      orderBy: { initiatedAt: 'asc' },
    });

    return {
      refunds: refunds.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        returnRequestId: r.returnRequestId,
        amount: Number(r.amount),
        status: r.status,
        reason: r.reason,
        initiatedAt: r.initiatedAt,
        processedAt: r.processedAt,
        // Intentionally omit razorpayRefundId from the public response by
        // default — the value is internal. Re-add here if a future feature
        // needs to display it (the value itself is not sensitive).
        razorpayRefundId: r.razorpayRefundId.startsWith('pending-') ? null : r.razorpayRefundId,
      })),
    };
  }
}
