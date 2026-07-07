import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationJobData } from './processors/notification.processor';

export interface NotificationResult {
  notificationId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue<NotificationJobData>,
  ) {}

  async findByUser(userId: string, type?: string) {
    const where: Record<string, unknown> = { userId };

    if (type) {
      where.type = type;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(dto: CreateNotificationDto): Promise<NotificationResult> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: 'manual',
        channel: dto.channel,
        title: dto.title,
        body: dto.body,
        dataJson: (dto.dataJson ?? undefined) as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });

    // Enqueue for processing
    await this.notificationsQueue.add('send-notification', {
      notificationId: notification.id,
    });

    this.logger.log(`Created notification ${notification.id} for user ${dto.userId}`);

    return { notificationId: notification.id };
  }
}
