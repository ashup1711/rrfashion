import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailerService } from '../mailer.service';
import { EmailService } from '../providers/email.service';
import { SmsService } from '../providers/sms.service';
import { PushService } from '../providers/push.service';

export interface NotificationJobData {
  notificationId: string;
}

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { notificationId } = job.data;
    this.logger.log(`Processing notification: ${notificationId}`);

    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
        include: { user: true },
      });

      if (!notification) {
        this.logger.warn(`Notification ${notificationId} not found, skipping`);
        return;
      }

      if (notification.status !== 'PENDING') {
        this.logger.log(`Notification ${notificationId} already ${notification.status}, skipping`);
        return;
      }

      let sent = false;

      switch (notification.channel) {
        case 'EMAIL': {
          if (notification.user?.email) {
            // Send via MailerService (Nodemailer)
            await this.mailerService.sendMail(
              notification.user.email,
              notification.title ?? 'Notification',
              notification.body ?? '',
            );
            // Also notify via the stub EmailService for backward compat
            sent = await this.emailService.send({
              to: notification.user.email,
              subject: notification.title ?? 'Notification',
              body: notification.body ?? '',
            });
          }
          break;
        }
        case 'SMS': {
          if (notification.user?.phone) {
            sent = await this.smsService.send({
              to: notification.user.phone,
              message: notification.body ?? '',
            });
          }
          break;
        }
        case 'PUSH': {
          // STUB: In production, retrieve device token from user device registry
          sent = await this.pushService.send({
            deviceToken: 'stub-device-token',
            title: notification.title ?? 'Notification',
            body: notification.body ?? '',
          });
          break;
        }
        case 'IN_APP': {
          // In-app notifications are already stored in DB — mark as SENT
          sent = true;
          break;
        }
        default: {
          this.logger.warn(`Unknown channel: ${notification.channel}`);
          sent = false;
        }
      }

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: sent ? 'SENT' : 'FAILED',
          sentAt: sent ? new Date() : null,
          failedReason: sent ? null : 'Provider returned failure',
        },
      });

      this.logger.log(`Notification ${notificationId} ${sent ? 'sent' : 'failed'}`);
    } catch (error) {
      this.logger.error(`Failed to process notification ${notificationId}`, error);

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          failedReason: (error as Error).message,
        },
      });
    }
  }
}
