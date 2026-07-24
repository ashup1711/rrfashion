/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { register as promRegister } from 'prom-client';
import { createHmac } from 'crypto';

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: jest.fn() },
    paymentLink: { create: jest.fn() },
    customers: { all: jest.fn() },
    payments: { refund: jest.fn(), capture: jest.fn() },
  }));
});

function createMockPrisma() {
  return {
    order: { findUnique: jest.fn(), update: jest.fn() },
    payment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    processedWebhookEvent: { create: jest.fn() },
  };
}

function createMockRedis() {
  return {
    setLock: jest.fn().mockResolvedValue(true),
    get: jest.fn(),
  };
}

function createMockConfigService(defaults?: Record<string, string>) {
  const config: Record<string, string> = defaults ?? {
    RAZORPAY_KEY_ID: 'rzp_test_12345678',
    RAZORPAY_KEY_SECRET: 'test_secret_12345',
    RAZORPAY_WEBHOOK_SECRET: 'webhook_secret',
  };
  return { get: jest.fn((key: string) => config[key]) };
}

function createMockRazorApi() {
  return {
    orders: { create: jest.fn() },
    paymentLink: { create: jest.fn() },
    customers: { all: jest.fn() },
    payments: { refund: jest.fn(), capture: jest.fn() },
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let configService: ConfigService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeAll(async () => {
    promRegister.clear();
  });

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    const mockRedis = createMockRedis();
    const mockConfig = createMockConfigService();

    service = new PaymentsService(
      mockPrisma as unknown as PrismaService,
      mockConfig as unknown as ConfigService,
      mockRedis as unknown as RedisService,
    );
    configService = mockConfig as unknown as ConfigService;
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    promRegister.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should log error when credentials are missing', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith(
        'RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET not found in environment variables.',
      );
    });

    it('should detect test mode credentials', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        '⚠ Using Razorpay TEST MODE. Payments will not be real.',
      );
    });

    it('should detect live mode credentials', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'RAZORPAY_KEY_ID') return 'rzp_live_87654321';
        return 'test_secret_12345';
      });

      service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith(
        '✓ Using Razorpay LIVE MODE. Payments are REAL.',
      );
    });

    it('should mask credentials in logs', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/KEY_ID=rzp_test\*\*\*/),
      );
    });

    it('should warn when key format is unexpected', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'RAZORPAY_KEY_ID') return 'invalid_key_format';
        return 'test_secret_12345';
      });

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        '⚠ Razorpay KEY_ID has unexpected format.',
      );
    });

    it('should warn when webhook secret is missing', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return undefined;
        return 'test_secret_12345';
      });

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        '⚠ RAZORPAY_WEBHOOK_SECRET not set. Webhook signature verification will fail.',
      );
    });

    it('should log when webhook secret is configured', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith(
        '✓ Razorpay webhook secret configured.',
      );
    });
  });

  describe('checkHealth', () => {
    it('should return healthy when Razorpay API responds quickly', async () => {
      const mockApi = createMockRazorApi();
      mockApi.customers.all.mockResolvedValue([]);
      jest.spyOn(service as any, 'getRazorpay').mockReturnValue(mockApi);
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(100);

      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.mode).toBe('test');
      expect(result.latency).toBe(100);
    });

    it('should return degraded when latency exceeds threshold', async () => {
      const mockApi = createMockRazorApi();
      mockApi.customers.all.mockResolvedValue([]);
      jest.spyOn(service as any, 'getRazorpay').mockReturnValue(mockApi);
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1500);

      const result = await service.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.latency).toBe(1500);
    });

    it('should return unhealthy when Razorpay API call fails', async () => {
      const mockApi = createMockRazorApi();
      mockApi.customers.all.mockRejectedValue(new Error('API timeout'));
      jest.spyOn(service as any, 'getRazorpay').mockReturnValue(mockApi);
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(500);

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('API timeout');
    });
  });

  describe('createOrder', () => {
    const dto = { orderId: 'order-1', amount: 10000, currency: 'INR' };

    it('should throw ServiceUnavailableException when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.createOrder(dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException on Razorpay API failure', async () => {
      const mockApi = createMockRazorApi();
      mockApi.orders.create.mockRejectedValue({
        message: 'Invalid credentials',
        statusCode: 401,
        error: { code: 'BAD_REQUEST_ERROR' },
      });
      (service as any).getRazorpay = () => mockApi;
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
      });
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-1' });

      await expect(service.createOrder(dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should reject immediately when circuit breaker is already open', async () => {
      const mockApi = createMockRazorApi();
      mockApi.orders.create.mockRejectedValue(new Error('Network error'));
      (service as any).getRazorpay = () => mockApi;
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
      });
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-1' });

      // First call opens the circuit (volumeThreshold default is 0)
      try {
        await service.createOrder(dto);
      } catch {
        /* expected */
      }

      await expect(service.createOrder(dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should return Razorpay order data on success', async () => {
      const mockApi = createMockRazorApi();
      const mockRazorpayOrder = {
        id: 'rzp_order_123',
        amount: 10000,
        currency: 'INR',
      };
      mockApi.orders.create.mockResolvedValue(mockRazorpayOrder);
      (service as any).getRazorpay = () => mockApi;
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
      });
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-1' });

      const result = await service.createOrder(dto);

      expect(result).toEqual(mockRazorpayOrder);
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-1',
            razorpayOrderId: 'rzp_order_123',
          }),
        }),
      );
    });
  });

  describe('createPaymentLink', () => {
    it('should throw BadRequestException when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentLink('non-existent', 10000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return payment link data on success', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
      });
      const mockApi = createMockRazorApi();
      mockApi.paymentLink.create.mockResolvedValue({
        id: 'link_123',
        short_url: 'https://rzp.io/i/abc123',
      });
      jest.spyOn(service as any, 'getRazorpay').mockReturnValue(mockApi);

      const result = await service.createPaymentLink('order-1', 10000);

      expect(result).toEqual({
        paymentLinkId: 'link_123',
        shortUrl: 'https://rzp.io/i/abc123',
      });
    });

    it('should throw InternalServerErrorException on Razorpay failure', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-001',
      });
      const mockApi = createMockRazorApi();
      mockApi.paymentLink.create.mockRejectedValue(
        new Error('Rate limit exceeded'),
      );
      jest.spyOn(service as any, 'getRazorpay').mockReturnValue(mockApi);

      await expect(
        service.createPaymentLink('order-1', 10000),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('createOrderWithRetry', () => {
    const dto = { orderId: 'order-1', amount: 10000, currency: 'INR' };

    it('should retry on transient errors with ETIMEDOUT', async () => {
      const spy = jest.spyOn(service, 'createOrder');
      spy.mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({ id: 'rzp_order_123' });

      const result = await service.createOrderWithRetry(dto, 3);

      expect(result).toEqual({ id: 'rzp_order_123' });
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('should retry on 5xx server errors', async () => {
      const spy = jest.spyOn(service, 'createOrder');
      const err5xx = new Error('Server error') as any;
      err5xx.statusCode = 503;
      spy.mockRejectedValueOnce(err5xx).mockResolvedValueOnce({
        id: 'rzp_order_456',
      });

      const result = await service.createOrderWithRetry(dto, 3);

      expect(result).toEqual({ id: 'rzp_order_456' });
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 4xx client errors', async () => {
      const spy = jest.spyOn(service, 'createOrder');
      const err4xx = new Error('Bad request') as any;
      err4xx.statusCode = 400;
      spy.mockRejectedValue(err4xx);

      await expect(service.createOrderWithRetry(dto, 3)).rejects.toThrow(
        'Bad request',
      );
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should throw after exhausting all retries', async () => {
      const spy = jest.spyOn(service, 'createOrder');
      const err = new Error('ETIMEDOUT');
      spy.mockRejectedValue(err);

      await expect(service.createOrderWithRetry(dto, 2)).rejects.toThrow(
        'ETIMEDOUT',
      );
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should retry NestJS exceptions (no statusCode property)', async () => {
      const spy = jest.spyOn(service, 'createOrder');
      spy.mockRejectedValue(
        new InternalServerErrorException('Server hiccup'),
      );

      await expect(service.createOrderWithRetry(dto, 3)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe('verifyPayment', () => {
    const validDto = {
      razorpayOrderId: 'order_Oi7s8d9fgh',
      razorpayPaymentId: 'pay_Oi7s8d9fgh',
      razorpaySignature: '',
    };

    it('should throw BadRequestException on invalid signature', async () => {
      validDto.razorpaySignature = 'invalid_signature';

      await expect(service.verifyPayment(validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return verified result on valid signature', async () => {
      const expectedSig = createHmac('sha256', 'test_secret_12345')
        .update(
          `${validDto.razorpayOrderId}|${validDto.razorpayPaymentId}`,
        )
        .digest('hex');
      validDto.razorpaySignature = expectedSig;

      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        orderId: 'order-1',
      });
      mockPrisma.payment.update.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({});

      const result = await service.verifyPayment(validDto);

      expect(result).toEqual({ verified: true, paymentId: 'pay-1' });
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1' },
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
    });

    it('should throw BadRequestException when payment record not found', async () => {
      const expectedSig = createHmac('sha256', 'test_secret_12345')
        .update(
          `${validDto.razorpayOrderId}|${validDto.razorpayPaymentId}`,
        )
        .digest('hex');
      validDto.razorpaySignature = expectedSig;

      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.verifyPayment(validDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
