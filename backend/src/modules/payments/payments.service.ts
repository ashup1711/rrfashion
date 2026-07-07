import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from '../../redis/redis.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpayInstance: Razorpay | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  private getRazorpay(): Razorpay {
    if (!this.razorpayInstance) {
      const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
      const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');

      if (!keyId || !keySecret) {
        throw new InternalServerErrorException('Razorpay not configured');
      }

      this.razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
    return this.razorpayInstance;
  }

  async createOrder(dto: CreateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const options = {
      amount: dto.amount,
      currency: dto.currency || 'INR',
      receipt: `receipt_${order.orderNumber}`,
      notes: { order_id: dto.orderId },
    };

    try {
      const razorpayOrder = await this.getRazorpay().orders.create(options as any);

      const razorpayData = JSON.parse(JSON.stringify(razorpayOrder));

      await this.prisma.payment.create({
        data: {
          orderId: dto.orderId,
          razorpayOrderId: razorpayData.id,
          amount: dto.amount / 100,
          currency: dto.currency || 'INR',
          type: 'SALE_PAYMENT',
          channel: 'ONLINE',
          status: 'PENDING',
          metadata: { razorpay_order_id: razorpayData.id, amount: dto.amount },
        },
      });

      return razorpayData;
    } catch (error) {
      this.logger.error('Failed to create Razorpay order', error);
      throw new InternalServerErrorException('Payment order creation failed');
    }
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = dto;

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const secret = this.config.get<string>('RAZORPAY_KEY_SECRET') || '';
    const expectedSignature = createHmac('sha256', secret).update(body).digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId },
    });

    if (!payment) {
      throw new BadRequestException('Payment record not found');
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId,
        status: 'PAID',
      },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: 'PAID' },
    });

    return { verified: true, paymentId: payment.id };
  }

  async processWebhook(signature: string, rawBody: string, eventId?: string) {
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
    const expectedSignature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const resolvedEventId =
      eventId ?? (payload.event_id as string | undefined) ?? (payload.id as string | undefined);

    if (!resolvedEventId) {
      throw new BadRequestException('Missing webhook event ID');
    }

    // Fast-path Redis deduplication for the 24-hour window.
    const dedupKey = `webhook:razorpay:${resolvedEventId}`;
    const alreadyProcessed = await this.redis.setLock(dedupKey, 86400);

    if (!alreadyProcessed) {
      return { received: true, deduped: true };
    }

    this.logger.log(
      `Processing Razorpay webhook event ${resolvedEventId}: ${String(payload.event)}`,
    );
    this.logger.debug({ eventId: resolvedEventId, payload }, 'Raw Razorpay webhook payload');

    return this.prisma.$transaction(async (tx) => {
      try {
        await tx.processedWebhookEvent.create({
          data: {
            eventId: resolvedEventId,
            eventType: String(payload.event ?? 'unknown'),
            payload: payload as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        if (this.isPrismaUniqueViolation(error)) {
          this.logger.warn(`Duplicate webhook event ignored: ${resolvedEventId}`);
          return { received: true, deduped: true };
        }
        throw error;
      }

      const eventPayload = payload.payload as Record<string, unknown> | undefined;
      const paymentEntity = (eventPayload?.payment as Record<string, unknown> | undefined)
        ?.entity as Record<string, unknown> | undefined;

      if (!paymentEntity) {
        return { received: true, ignored: true };
      }

      switch (payload.event) {
        case 'payment.captured': {
          const existing = await tx.payment.findFirst({
            where: { razorpayPaymentId: paymentEntity.id as string },
          });

          if (existing) {
            await tx.payment.update({
              where: { id: existing.id },
              data: { status: 'PAID', razorpayEventId: resolvedEventId },
            });
            await tx.order.update({
              where: { id: existing.orderId },
              data: { paymentStatus: 'PAID' },
            });
          }
          break;
        }

        case 'payment.failed': {
          const existing = await tx.payment.findFirst({
            where: { razorpayOrderId: paymentEntity.order_id as string },
          });
          if (existing) {
            await tx.payment.update({
              where: { id: existing.id },
              data: { status: 'FAILED', razorpayEventId: resolvedEventId },
            });
          }
          break;
        }

        case 'payment.authorized': {
          const existing = await tx.payment.findFirst({
            where: { razorpayPreAuthId: paymentEntity.id as string },
          });
          if (existing) {
            await tx.payment.update({
              where: { id: existing.id },
              data: {
                preAuthStatus: 'AUTHORIZED',
                razorpayEventId: resolvedEventId,
              },
            });
          }
          break;
        }

        default:
          this.logger.log(`Unhandled webhook event: ${String(payload.event)}`);
      }

      return { received: true };
    });
  }

  private isPrismaUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }

  async refund(paymentId: string, amount?: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || !payment.razorpayPaymentId) {
      throw new BadRequestException('Payment not found or not captured');
    }

    try {
      const refundOptions: Record<string, unknown> = {};
      if (amount) {
        refundOptions.amount = Math.round(amount * 100);
      }

      const razorpayRefund = await this.getRazorpay().payments.refund(
        payment.razorpayPaymentId,
        refundOptions,
      );

      const refundData = JSON.parse(JSON.stringify(razorpayRefund));

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: amount ? 'PARTIALLY_REFUNDED' : 'REFUNDED' },
      });

      return refundData;
    } catch (error) {
      this.logger.error('Refund failed', error);
      throw new InternalServerErrorException('Refund processing failed');
    }
  }

  async getPaymentsByOrder(orderId: string) {
    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ──────────────────────────────────────────────
  //  Pre-auth (authorize/capture) helper methods
  // ──────────────────────────────────────────────

  async createPreAuthPayment(amount: number, description: string) {
    try {
      // Razorpay SDK types for v2.x don't expose .create() on payments,
      // but the API does support creating a payment directly with capture: false.
      const razorpay = this.getRazorpay();
      const razorpayPayment = await (razorpay.payments as any).create({
        amount,
        currency: 'INR',
        capture: false,
        description,
      });
      return JSON.parse(JSON.stringify(razorpayPayment));
    } catch (error) {
      this.logger.error('Failed to create Razorpay pre-auth payment', error);
      throw new InternalServerErrorException('Pre-auth payment creation failed');
    }
  }

  async capturePreAuth(razorpayPreAuthId: string, amount: number) {
    try {
      const razorpayPayment = await this.getRazorpay().payments.capture(
        razorpayPreAuthId,
        amount,
        'INR',
      );
      return JSON.parse(JSON.stringify(razorpayPayment));
    } catch (error) {
      this.logger.error('Failed to capture pre-auth payment', error);
      throw new InternalServerErrorException('Pre-auth capture failed');
    }
  }

  async releasePreAuth(razorpayPreAuthId: string) {
    try {
      // Full refund (release) of the pre-auth hold — pass empty params object
      const refund = await this.getRazorpay().payments.refund(razorpayPreAuthId, {});
      return JSON.parse(JSON.stringify(refund));
    } catch (error) {
      this.logger.error('Failed to release pre-auth payment', error);
      throw new InternalServerErrorException('Pre-auth release failed');
    }
  }
}
