import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationProcessor } from './processors/notification.processor';
import { EmailService } from './providers/email.service';
import { MailerService } from './mailer.service';
import { SmsService } from './providers/sms.service';
import { PushService } from './providers/push.service';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'notifications' })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    NotificationProcessor,
    EmailService,
    MailerService,
    SmsService,
    PushService,
  ],
  exports: [NotificationsService, NotificationsGateway, SmsService],
})
export class NotificationsModule {}
