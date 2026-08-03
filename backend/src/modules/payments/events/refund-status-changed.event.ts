/**
 * REQ-NOTIF-001: RefundStatusChangedEvent.
 *
 * Domain event published via NestJS EventEmitter2 when a refund transitions to
 * a terminal status (`PROCESSED` or `FAILED`) inside the Razorpay webhook
 * handler. The NotificationsModule listener (`refund-status.listener.ts`)
 * subscribes via @OnEvent('refund.status.changed') and creates the notification
 * rows for the in-app inbox + transactional email/SMS stubs.
 *
 * The event class is intentionally framework-agnostic — it imports no Prisma
 * enums or decorators so it can be safely serialized for cross-process
 * delivery if/when a worker is split out (REQ-ARCH-004).
 */

export type RefundStatusValue = 'PROCESSED' | 'FAILED';

export class RefundStatusChangedEvent {
  /** Stable event name for @OnEvent('refund.status.changed') subscriptions. */
  static readonly eventName = 'refund.status.changed' as const;

  readonly refundId: string;
  readonly orderId: string;
  readonly status: RefundStatusValue;
  /** Refund amount in rupees (Decimal from Refund.amount, already Number). */
  readonly amount: number;
  /** ISO timestamp the terminal status was committed. */
  readonly processedAt: string;

  constructor(payload: {
    refundId: string;
    orderId: string;
    status: RefundStatusValue;
    amount: number;
    processedAt?: Date;
  }) {
    this.refundId = payload.refundId;
    this.orderId = payload.orderId;
    this.status = payload.status;
    this.amount = payload.amount;
    this.processedAt = (payload.processedAt ?? new Date()).toISOString();
  }
}
