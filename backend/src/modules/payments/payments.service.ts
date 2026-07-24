import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker from 'opossum';
import { Counter, Histogram } from 'prom-client';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from '../../redis/redis.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpayInstance: Razorpay | null = null;

  // Metrics
  private readonly paymentOrderCreationTotal = new Counter({
    name: 'payment_order_creation_total',
    help: 'Total number of payment order creation attempts',
    labelNames: ['status', 'payment_method'],
  });

  private readonly paymentOrderCreationDuration = new Histogram({
    name: 'payment_order_creation_duration_seconds',
    help: 'Duration of payment order creation in seconds',
    labelNames: ['status'],
    buckets: [0.1, 0.3, 0.5, 1, 2, 5],
  });

  // Circuit breaker
  private createOrderBreaker: CircuitBreaker<[CreateOrderDto], unknown>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    // Initialize circuit breaker immediately so it's available
    this.createOrderBreaker = new CircuitBreaker(this.createOrderInternal.bind(this), {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    });

    this.createOrderBreaker.on('open', () => {
      this.logger.error('⚡ Razorpay circuit breaker OPENED - API is unhealthy');
    });

    this.createOrderBreaker.on('halfOpen', () => {
      this.logger.warn('⚡ Razorpay circuit breaker HALF-OPEN - testing recovery');
    });

    this.createOrderBreaker.on('close', () => {
      this.logger.log('✓ Razorpay circuit breaker CLOSED - API is healthy');
    });
  }

  onModuleInit() {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');

    if (!keyId || !keySecret) {
      this.logger.error('========================================');
      this.logger.error('RAZORPAY CONFIGURATION MISSING!');
      this.logger.error(
        'RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET not found in environment variables.',
      );
      this.logger.error('Payment integration will NOT work.');
      this.logger.error(
        'Please check your .env file and ensure ConfigModule is properly configured.',
      );
      this.logger.error('========================================');
    } else {
      const maskedKeyId = keyId.length > 8 ? `${keyId.substring(0, 8)}***` : '***';
      this.logger.log(`✓ Razorpay credentials loaded: KEY_ID=${maskedKeyId}`);

      // Validate key format — warn if it doesn't match expected prefix
      if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
        this.logger.warn('⚠ Razorpay KEY_ID has unexpected format.');
        this.logger.warn('  Expected: rzp_test_... or rzp_live_...');
        this.logger.warn('  Actual: ' + maskedKeyId);
        this.logger.warn('  This may indicate a typo or incorrect value.');
      } else if (keyId.startsWith('rzp_test_')) {
        this.logger.warn('⚠ Using Razorpay TEST MODE. Payments will not be real.');
      } else if (keyId.startsWith('rzp_live_')) {
        this.logger.log('✓ Using Razorpay LIVE MODE. Payments are REAL.');
      }

      // Validate secret format — warn if too short
      if (keySecret.length < 10) {
        this.logger.warn('⚠ RAZORPAY_KEY_SECRET appears too short. Expected ~20 characters.');
        this.logger.warn('  This may indicate a typo or incorrect value.');
      }
    }

    if (!webhookSecret) {
      this.logger.warn(
        '⚠ RAZORPAY_WEBHOOK_SECRET not set. Webhook signature verification will fail.',
      );
    } else {
      this.logger.log('✓ Razorpay webhook secret configured.');
    }
  }

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

  // ──────────────────────────────────────────────
  //  Core Internal Implementation
  // ──────────────────────────────────────────────

  /**
   * Core Razorpay order creation logic.
   * This is the private implementation wrapped by the circuit breaker.
   */
  private async createOrderInternal(dto: CreateOrderDto): Promise<unknown> {
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
      const razorpayOrder = await this.getRazorpay().orders.create(options as never);

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
      const err = error as Error & { statusCode?: number; error?: unknown };
      this.logger.error({
        message: 'Failed to create Razorpay order',
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency || 'INR',
        error: err.message,
        statusCode: err.statusCode,
        razorpayError: err.error,
        stack: err.stack,
      });
      throw new InternalServerErrorException(
        'Payment order creation failed. Please check Razorpay credentials and connectivity.',
      );
    }
  }

  // ──────────────────────────────────────────────
  //  Public createOrder — circuit breaker + metrics
  // ──────────────────────────────────────────────

  /**
   * Creates a Razorpay order through the circuit breaker and records metrics.
   * The circuit breaker protects against cascading failures when the Razorpay API is down.
   */
  async createOrder(dto: CreateOrderDto): Promise<unknown> {
    const startTime = Date.now();

    try {
      const result = await this.createOrderBreaker.fire(dto);

      this.paymentOrderCreationTotal.inc({ status: 'success', payment_method: 'razorpay' });
      this.paymentOrderCreationDuration.observe(
        { status: 'success' },
        (Date.now() - startTime) / 1000,
      );

      return result;
    } catch (error) {
      this.paymentOrderCreationTotal.inc({ status: 'failure', payment_method: 'razorpay' });
      this.paymentOrderCreationDuration.observe(
        { status: 'failure' },
        (Date.now() - startTime) / 1000,
      );

      if (this.createOrderBreaker.opened) {
        this.logger.error(
          { orderId: dto.orderId },
          'Circuit breaker is open — Razorpay API is unavailable',
        );
        throw new ServiceUnavailableException(
          'Payment gateway is temporarily unavailable. Please try again in a few minutes or choose Cash on Delivery.',
        );
      }

      throw error;
    }
  }

  // ──────────────────────────────────────────────
  //  createOrderWithRetry — exponential backoff
  // ──────────────────────────────────────────────

  /**
   * Creates a Razorpay order with automatic retry on transient errors.
   * Retries with exponential backoff: 1s, 2s, 4s.
   * Does NOT retry 4xx client errors — only retries 5xx, network timeouts, and connection refused.
   */
  async createOrderWithRetry(dto: CreateOrderDto, maxRetries = 3): Promise<unknown> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.createOrder(dto);
      } catch (error) {
        lastError = error as Error;
        const err = error as Error & { statusCode?: number };

        // Only retry on transient errors (no status code, 5xx, network timeout/refused)
        const isTransient =
          !err.statusCode ||
          err.statusCode >= 500 ||
          err.message.includes('ETIMEDOUT') ||
          err.message.includes('ECONNREFUSED');

        if (!isTransient || attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        this.logger.warn(
          {
            orderId: dto.orderId,
            attempt,
            maxRetries,
            delayMs,
            error: err.message,
          },
          'Razorpay API call failed, retrying...',
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError ?? new InternalServerErrorException('Retry attempt failed unexpectedly');
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
  //  Health Check
  // ──────────────────────────────────────────────

  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    provider: string;
    mode: 'test' | 'live';
    latency?: number;
    lastChecked: Date;
    error?: string;
  }> {
    const startTime = Date.now();
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');

    try {
      // Lightweight API call to verify Razorpay connectivity
      const razorpay = this.getRazorpay();
      await razorpay.customers.all({ count: 1 });

      const latency = Date.now() - startTime;

      return {
        status: latency < 1000 ? 'healthy' : 'degraded',
        provider: 'razorpay',
        mode: keyId?.startsWith('rzp_test_') ? 'test' : 'live',
        latency,
        lastChecked: new Date(),
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        status: 'unhealthy',
        provider: 'razorpay',
        mode: keyId?.startsWith('rzp_test_') ? 'test' : 'live',
        latency,
        lastChecked: new Date(),
        error: (error as Error).message,
      };
    }
  }

  // ──────────────────────────────────────────────
  //  Payment Link Fallback
  // ──────────────────────────────────────────────

  async createPaymentLink(
    orderId: string,
    amount: number,
  ): Promise<{ paymentLinkId: string; shortUrl: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    try {
      const paymentLink = await this.getRazorpay().paymentLink.create({
        amount,
        currency: 'INR',
        accept_partial: false,
        description: `Payment for order ${order.orderNumber}`,
        reference_id: order.orderNumber,
        notes: { order_id: orderId },
        notify: {
          sms: true,
          email: true,
        },
      } as never);

      this.logger.log(
        {
          orderId,
          paymentLinkId: paymentLink.id,
          shortUrl: paymentLink.short_url,
        },
        'Payment link created',
      );

      return {
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
      };
    } catch (error) {
      this.logger.error(
        {
          orderId,
          error: (error as Error).message,
        },
        'Failed to create payment link',
      );
      throw new InternalServerErrorException('Failed to create payment link');
    }
  }

  // ──────────────────────────────────────────────
  //  Pre-auth (authorize/capture) helper methods
  // ──────────────────────────────────────────────

  async createPreAuthPayment(amount: number, description: string) {
    try {
      // Razorpay SDK types for v2.x don't expose .create() on payments,
      // but the API does support creating a payment directly with capture: false.
      const razorpay = this.getRazorpay();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
