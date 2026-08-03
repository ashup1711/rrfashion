/**
 * REQ-BE-002: OrderCancelledEvent.
 *
 * Domain event published via NestJS EventEmitter2 after a successful
 * order cancellation. Listeners (notifications, analytics, integrations)
 * subscribe via @OnEvent('order.cancelled') and must treat the payload
 * as immutable.
 *
 * The event class is intentionally framework-agnostic: it does not import
 * Prisma enums or decorators so it can be safely serialized for cross-
 * process delivery if/when a worker is split out (REQ-ARCH-004).
 */

import { CancellationReason } from '@prisma/client';

export interface OrderCancelledItem {
  /** OrderItem.id (UUID) — unique per order line. */
  orderItemId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  /** Item-level unit price in paise (integer) for downstream math. */
  unitPricePaise: number;
  /** True when the item is a rental (released inventory path is different). */
  isRental: boolean;
}

export class OrderCancelledEvent {
  /** Stable event name for @OnEvent('order.cancelled') subscriptions. */
  static readonly eventName = 'order.cancelled' as const;

  readonly orderId: string;
  readonly orderNumber: string;
  /** Customer userId for user-attached orders; null for guest orders. */
  readonly userId: string | null;
  /** Guest session id for guest orders; null for user-attached orders. */
  readonly guestSessionId: string | null;
  /** Refund id (from Refund table) when a refund was auto-triggered. */
  readonly refundId: string | null;
  /** 'USER' for self-cancel, 'ADMIN' for admin override, 'SYSTEM' for cron/automation. */
  readonly cancelledBy: 'USER' | 'ADMIN' | 'SYSTEM';
  /** Actor userId / adminId for audit; null for system. */
  readonly actorId: string | null;
  readonly reason: CancellationReason;
  /** Original order total in paise. */
  readonly totalAmountPaise: number;
  readonly paymentStatus: string;
  readonly items: ReadonlyArray<OrderCancelledItem>;
  /** ISO timestamp the cancellation was committed. */
  readonly cancelledAt: string;

  constructor(payload: {
    orderId: string;
    orderNumber: string;
    userId: string | null;
    guestSessionId: string | null;
    refundId: string | null;
    cancelledBy: 'USER' | 'ADMIN' | 'SYSTEM';
    actorId: string | null;
    reason: CancellationReason;
    totalAmountPaise: number;
    paymentStatus: string;
    items: OrderCancelledItem[];
    cancelledAt?: Date;
  }) {
    this.orderId = payload.orderId;
    this.orderNumber = payload.orderNumber;
    this.userId = payload.userId;
    this.guestSessionId = payload.guestSessionId;
    this.refundId = payload.refundId;
    this.cancelledBy = payload.cancelledBy;
    this.actorId = payload.actorId;
    this.reason = payload.reason;
    this.totalAmountPaise = payload.totalAmountPaise;
    this.paymentStatus = payload.paymentStatus;
    this.items = Object.freeze([...payload.items]);
    this.cancelledAt = (payload.cancelledAt ?? new Date()).toISOString();
  }
}
