import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RefundStatusChangedEvent } from '../../payments/events/refund-status-changed.event';
import { NotificationJobData } from '../processors/notification.processor';

/** Stable notification `type` used for inbox grouping (REQ-NOTIF-001). */
const REFUND_STATUS_NOTIFICATION_TYPE = 'refund_status';
/** Stable job name used on the shared notifications queue. */
const SEND_NOTIFICATION_JOB = 'send-notification';

interface RefundTemplate {
  title: string;
  body: (amount: number, orderNumber: string) => string;
}

const REFUND_TEMPLATES: Record<RefundStatusChangedEvent['status'], RefundTemplate> = {
  PROCESSED: {
    title: 'Refund Processed',
    body: (amount, orderNumber) =>
      `Your refund of ₹${amount.toFixed(2)} for order ${orderNumber} has been processed. It will reflect in your account within 5-7 business days.`,
  },
  FAILED: {
    title: 'Refund Failed',
    body: (amount, orderNumber) =>
      `Your refund of ₹${amount.toFixed(2)} for order ${orderNumber} could not be completed. Please contact support for assistance.`,
  },
};

/**
 * REQ-NOTIF-001: listens for `refund.status.changed` (emitted by the Razorpay
 * webhook handler after commit) and creates Notification rows for the in-app
 * inbox + the transactional email/SMS channels.
 *
 * Both channels are Phase-1 stubs (EmailService / SmsService in the notification
 * processor); real provider integration is REQ-BE-019/022. The Notification row
 * is still created so the in-app inbox works from day one.
 */
@Injectable()
export class RefundStatusListener {
  private readonly logger = new Logger(RefundStatusListener.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue<NotificationJobData>,
  ) {}

  @OnEvent(RefundStatusChangedEvent.eventName)
  async handleRefundStatusChanged(event: RefundStatusChangedEvent): Promise<void> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: event.refundId },
      include: {
        order: {
          select: {
            orderNumber: true,
            userId: true,
            guestSessionId: true,
            user: { select: { id: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!refund) {
      this.logger.warn({
        refundId: event.refundId,
        action: 'refund.notification.skipped.refund_missing',
      });
      return;
    }

    const user = refund.order.user;
    if (!user) {
      // Guest-session-only orders have no resolvable email on GuestSession
      // (schema has no email column; REQ-NOTIF-001 DB note says no change).
      // Log and skip — the SMS/email provider work is REQ-BE-019/022 anyway.
      this.logger.warn({
        refundId: event.refundId,
        orderId: event.orderId,
        guestSessionId: refund.order.guestSessionId,
        action: 'refund.notification.skipped.no_recipient_user',
      });
      return;
    }

    const template = REFUND_TEMPLATES[event.status];

    for (const channel of ['EMAIL', 'SMS'] as const) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: REFUND_STATUS_NOTIFICATION_TYPE,
          channel,
          title: template.title,
          body: template.body(event.amount, refund.order.orderNumber),
          dataJson: {
            refundId: event.refundId,
            orderId: event.orderId,
            status: event.status,
            amount: event.amount,
          } as Prisma.InputJsonValue,
          status: 'PENDING',
        },
      });

      await this.notificationsQueue.add(SEND_NOTIFICATION_JOB, {
        notificationId: notification.id,
      });
    }

    this.logger.log({
      refundId: event.refundId,
      orderId: event.orderId,
      status: event.status,
      recipientUserId: user.id,
      action: 'refund.notification.created',
    });
  }
}
