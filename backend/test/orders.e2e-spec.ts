/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { OrdersController } from '../src/modules/orders/orders.controller';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../src/storage/storage.service';
import { NotificationsGateway } from '../src/modules/notifications/notifications.gateway';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { StoreAuthGuard } from '../src/common/guards/store-auth.guard';

describe('Orders - POST /orders (e2e)', () => {
  let app: INestApplication;

  const mockPaymentsService = {
    createOrderWithRetry: jest.fn(),
    createPaymentLink: jest.fn(),
  };

  const mockCreatedOrder = {
    id: 'order-1',
    orderNumber: 'ORD-ABCD1234',
    status: 'PENDING',
    totalAmount: 1000,
    subtotal: 1000,
    items: [
      {
        id: 'item-1',
        product: { id: 'product-1', name: 'Test Product', slug: 'test-product', images: [] },
        variant: { id: 'variant-1', size: 'M', color: 'Black' },
        quantity: 1,
        unitPrice: 1000,
      },
    ],
    shippingAddress: {
      name: 'Test User',
      phone: '9999999999',
      line1: '123 Test St',
      city: 'Mumbai',
      state: 'MH',
      pincode: '400001',
    },
    paymentMethod: 'razorpay',
    notes: null,
    createdAt: new Date(),
  };

  const mockPrisma = {
    cart: {
      findUnique: jest.fn(),
    },
    guestCartItem: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
    storeLocation: {
      findFirst: jest.fn(),
    },
    order: {
      create: jest.fn(),
    },
    inventorySummary: {
      update: jest.fn(),
    },
    shippingAddress: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_12345678';
      return null;
    }),
  };

  const mockStorageService = {
    upload: jest.fn(),
    download: jest.fn(),
    getPublicUrl: jest.fn(),
    delete: jest.fn(),
    uploadStream: jest.fn(),
    uploadFile: jest.fn(),
  };

  const mockNotificationsGateway = {
    sendOrderUpdate: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  function mockDecimal(val: number) {
    return { mul: jest.fn().mockReturnValue(val), toNumber: () => val } as any;
  }

  function setupCartMocks(guest = false) {
    const item = {
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
      type: 'sale',
      rentStart: null,
      rentEnd: null,
      product: {
        id: 'product-1',
        name: 'Test Product',
        basePrice: mockDecimal(1000),
        salePrice: null,
        isActive: true,
      },
      variant: {
        id: 'variant-1',
        isActive: true,
        deletedAt: null,
        salePrice: null,
      },
    };

    if (guest) {
      mockPrisma.guestCartItem.findMany.mockResolvedValue([item]);
    } else {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [item],
      });
    }
  }

  function setupTransactionMock() {
    mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
      const tx = {
        order: {
          create: jest.fn().mockResolvedValue(mockCreatedOrder),
        },
        $queryRaw: jest.fn().mockResolvedValue([
          {
            variantId: 'variant-1',
            storeId: 'store-1',
            quantityAvailable: 10,
            quantityReserved: 0,
            quantityLocked: 0,
            quantitySold: 5,
            updatedAt: new Date(),
          },
        ]),
        inventorySummary: { update: jest.fn() },
        shippingAddress: { create: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
        guestCartItem: { deleteMany: jest.fn() },
      };
      return cb(tx);
    });
  }

  beforeAll(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    })
      .overrideGuard(StoreAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = {
            id: 'test-user-id',
            sub: 'test-user-id',
            type: 'customer',
            email: 'test@example.com',
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.storeLocation.findFirst.mockResolvedValue({
      id: 'store-1',
      isActive: true,
    });
  });

  const validBody = {
    shippingAddress: {
      name: 'Test User',
      phone: '9999999999',
      line1: '123 Test St',
      city: 'Mumbai',
      state: 'MH',
      pincode: '400001',
    },
    paymentMethod: 'razorpay',
  };

  describe('POST /orders', () => {
    it('should return razorpayError when Razorpay order creation fails', async () => {
      setupCartMocks();
      setupTransactionMock();

      mockPaymentsService.createOrderWithRetry.mockRejectedValue(
        new Error('Razorpay API unavailable'),
      );
      mockPaymentsService.createPaymentLink.mockRejectedValue(
        new Error('Payment link creation failed'),
      );

      const res = await request(app.getHttpServer())
        .post('/orders')
        .send(validBody)
        .expect(201);
      expect(res.body).toHaveProperty('razorpayError');
      expect(res.body.razorpayError).toContain(
        'Failed to initialize payment gateway',
      );
      expect(res.body.razorpayOrderId).toBeNull();
      expect(res.body.id).toBe('order-1');
    });

    it('should return successful response with razorpayOrderId', async () => {
      setupCartMocks();
      setupTransactionMock();

      mockPaymentsService.createOrderWithRetry.mockResolvedValue({
        id: 'rzp_order_test_123',
        amount: 100000,
        currency: 'INR',
      });

      const res = await request(app.getHttpServer())
        .post('/orders')
        .send(validBody)
        .expect(201);

      expect(res.body).toHaveProperty('razorpayOrderId', 'rzp_order_test_123');
      expect(res.body).toHaveProperty('razorpayKeyId', 'rzp_test_12345678');
      expect(res.body.razorpayError).toBeNull();
      expect(res.body.id).toBe('order-1');
    });

    it('should handle guest user flow with guestSessionId', async () => {
      setupCartMocks(true);
      setupTransactionMock();

      mockPaymentsService.createOrderWithRetry.mockResolvedValue({
        id: 'rzp_order_guest_456',
        amount: 100000,
        currency: 'INR',
      });

      const res = await request(app.getHttpServer())
        .post('/orders')
        .send(validBody)
        .query({ guestSessionId: 'guest-session-123' })
        .expect(201);

      expect(res.body).toHaveProperty(
        'razorpayOrderId',
        'rzp_order_guest_456',
      );
      expect(res.body.razorpayError).toBeNull();
    });

    it('should create payment link fallback when Razorpay fails', async () => {
      setupCartMocks();
      setupTransactionMock();

      mockPaymentsService.createOrderWithRetry.mockRejectedValue(
        new Error('Timeout'),
      );
      mockPaymentsService.createPaymentLink.mockResolvedValue({
        paymentLinkId: 'plink_123',
        shortUrl: 'https://rzp.io/i/fallback',
      });

      const res = await request(app.getHttpServer())
        .post('/orders')
        .send(validBody)
        .expect(201);

      expect(res.body.razorpayError).toContain('payment link');
      expect(res.body.razorpayError).toContain('https://rzp.io/i/fallback');
      expect(res.body.razorpayOrderId).toBeNull();
    });

    it('should return empty cart error when cart has no items', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [],
      });

      await request(app.getHttpServer())
        .post('/orders')
        .send(validBody)
        .expect(400);
    });

    it('should return 400 when shipping address is missing', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({ paymentMethod: 'razorpay' })
        .expect(400);
    });
  });
});
