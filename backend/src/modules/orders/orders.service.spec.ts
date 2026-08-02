/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { InvoicesService } from '../invoices/invoices.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
    inventorySummary: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    orderStatusLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    storeLocation: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const mockStorage = {
    upload: jest.fn(),
    download: jest.fn(),
    getPublicUrl: jest.fn(),
    delete: jest.fn(),
  };

  const mockNotificationsGateway = {
    sendOrderUpdate: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const mockPaymentsService = {
    createPayment: jest.fn(),
    verifyPayment: jest.fn(),
  };

  const mockInvoicesService = {
    generate: jest.fn(),
    getFinancialYear: jest.fn(),
    nextInvoiceNumber: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(null),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: StorageService,
          useValue: mockStorage,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: InvoicesService,
          useValue: mockInvoicesService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have prisma service injected', () => {
    expect(prisma).toBeDefined();
  });

  describe('updateOrderStatus', () => {
    const mockOrder = {
      id: 'order-1',
      orderNumber: 'ORD-001',
      userId: 'user-1',
      status: 'PENDING',
      storeId: null,
      notes: null,
      totalAmount: 1000,
      deliveredAt: null,
      cancelledAt: null,
    };

    const mockUpdatedOrder = {
      ...mockOrder,
      status: 'CONFIRMED',
      items: [],
    };

    it('should perform valid transition (PENDING → CONFIRMED)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockUpdatedOrder);
      mockPrisma.orderStatusLog.create.mockResolvedValue({ id: 'log-1' });
      mockNotificationsGateway.sendOrderUpdate.mockReturnValue(undefined);
      mockNotificationsService.create.mockResolvedValue({ notificationId: 'notif-1' });

      const result = await service.updateOrderStatus('order-1', {
        status: 'CONFIRMED' as any,
      });

      expect(result.status).toBe('CONFIRMED');
      expect(mockPrisma.orderStatusLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          fromStatus: 'PENDING',
          toStatus: 'CONFIRMED',
        }),
      });
      expect(mockNotificationsGateway.sendOrderUpdate).toHaveBeenCalledWith('user-1', {
        orderId: 'order-1',
        status: 'CONFIRMED',
        message: 'Your order #ORD-001 has been confirmed!',
      });
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          channel: 'IN_APP',
          title: 'Order Update',
        }),
      );
    });

    it('should throw BadRequestException for invalid transition (PENDING → DELIVERED)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.updateOrderStatus('order-1', { status: 'DELIVERED' as any }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('should restore inventory and create audit log when cancelling', async () => {
      const orderToCancel = { ...mockOrder, status: 'PENDING' };
      mockPrisma.order.findUnique.mockResolvedValue(orderToCancel);

      const mockStore = { id: 'store-1', isActive: true };
      mockPrisma.storeLocation.findFirst.mockResolvedValue(mockStore);

      const orderItems = [
        { variantId: 'variant-1', quantity: 2 },
        { variantId: 'variant-2', quantity: 1 },
      ];
      mockPrisma.orderItem.findMany.mockResolvedValue(orderItems);

      const mockSummary = {
        variantId: 'variant-1',
        storeId: 'store-1',
        quantityAvailable: 10,
        quantityReserved: 0,
        quantitySold: 5,
        updatedAt: new Date(),
      };

      // $transaction receives a callback, we need to call it with a mock tx
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          orderItem: {
            findMany: mockPrisma.orderItem.findMany,
          },
          order: {
            update: jest.fn().mockResolvedValue({
              ...orderToCancel,
              status: 'CANCELLED',
              orderNumber: 'ORD-001',
              items: [],
            }),
          },
          orderStatusLog: {
            create: jest.fn().mockResolvedValue({ id: 'log-1' }),
          },
          inventorySummary: {
            update: mockPrisma.inventorySummary.update,
          },
          $queryRaw: jest.fn().mockResolvedValue([mockSummary]),
        };
        return cb(tx);
      });

      mockNotificationsGateway.sendOrderUpdate.mockReturnValue(undefined);
      mockNotificationsService.create.mockResolvedValue({ notificationId: 'notif-1' });

      const result = await service.updateOrderStatus('order-1', {
        status: 'CANCELLED',
      });

      expect(result.status).toBe('CANCELLED');
      expect(mockNotificationsGateway.sendOrderUpdate).toHaveBeenCalledWith('user-1', {
        orderId: 'order-1',
        status: 'CANCELLED',
        message: 'Your order #ORD-001 has been cancelled.',
      });
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('non-existent', { status: 'CONFIRMED' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllAdmin', () => {
    it('should return paginated results', async () => {
      const orders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-001',
          status: 'PENDING',
          totalAmount: 1000,
          items: [],
          user: {
            id: 'user-1',
            email: 'test@test.com',
            firstName: 'Test',
            lastName: 'User',
            phone: null,
          },
          payments: [],
          shippingAddresses: [],
          courierReceipts: [],
          invoices: [],
          statusLogs: [],
          userId: 'user-1',
          subtotal: 1000,
          discountAmount: 0,
          shippingCharge: 0,
          taxAmount: 0,
          paymentMethod: 'COD',
          paymentStatus: 'PENDING',
          shippingAddress: null,
          notes: null,
          storeId: null,
          channel: 'online',
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
          deliveredAt: null,
          couponId: null,
        },
      ];
      mockPrisma.order.findMany.mockResolvedValue(orders);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.findAllAdmin({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await service.findAllAdmin({ status: 'DELIVERED' as any });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DELIVERED' }),
        }),
      );
    });

    it('should enforce max limit of 100', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await service.findAllAdmin({ limit: 500 });

      const callArgs = mockPrisma.order.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
    });
  });

  describe('findOneAdmin', () => {
    it('should return order with user and payments', async () => {
      const mockOrderDetail = {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: 'PENDING',
        totalAmount: 1000,
        items: [],
        user: {
          id: 'user-1',
          email: 'test@test.com',
          firstName: 'Test',
          lastName: 'User',
          phone: null,
        },
        payments: [{ id: 'pay-1', amount: 1000, status: 'COMPLETED' }],
        shippingAddresses: [],
        courierReceipts: [],
        invoices: [],
        statusLogs: [],
        userId: 'user-1',
        subtotal: 1000,
        discountAmount: 0,
        shippingCharge: 0,
        taxAmount: 0,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        shippingAddress: null,
        notes: null,
        storeId: null,
        channel: 'online',
        createdAt: new Date(),
        updatedAt: new Date(),
        cancelledAt: null,
        deliveredAt: null,
        couponId: null,
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderDetail);

      const result = await service.findOneAdmin('order-1');

      expect(result.user!.email).toBe('test@test.com');
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].status).toBe('COMPLETED');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findOneAdmin('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('FIX-2 — anonymous "my order" access is rejected (SEC-06)', () => {
    const baseOrder = {
      id: 'order-1',
      orderNumber: 'ORD-001',
      status: 'PENDING',
      subtotal: 1000,
      discountAmount: 0,
      shippingCharge: 0,
      taxAmount: 0,
      totalAmount: 1000,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      shippingAddress: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
      invoices: [],
      userId: 'user-1',
      guestSessionId: null,
    };

    describe('findMyOrders', () => {
      it('rejects anonymous callers with UnauthorizedException and never queries Prisma', async () => {
        await expect(service.findMyOrders(null, {})).rejects.toThrow(UnauthorizedException);
        expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
        expect(mockPrisma.order.count).not.toHaveBeenCalled();
      });

      it('scopes listing by userId for an authenticated customer', async () => {
        mockPrisma.order.findMany.mockResolvedValue([baseOrder]);
        mockPrisma.order.count.mockResolvedValue(1);

        const result = await service.findMyOrders('user-1', {});

        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
        );
        expect(result.meta.total).toBe(1);
      });

      it('scopes listing by guestSessionId for a verified guest', async () => {
        mockPrisma.order.findMany.mockResolvedValue([]);
        mockPrisma.order.count.mockResolvedValue(0);

        await service.findMyOrders(null, {}, 'guest-1');

        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ guestSessionId: 'guest-1' }),
          }),
        );
      });
    });

    describe('findMyOrder', () => {
      it('rejects anonymous callers before querying the order', async () => {
        await expect(service.findMyOrder(null, 'order-1')).rejects.toThrow(UnauthorizedException);
        expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
      });

      it('returns the order when the customer owns it', async () => {
        mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder, userId: 'user-1' });

        const result = await service.findMyOrder('user-1', 'order-1');

        expect(result.id).toBe('order-1');
      });

      it('rejects when the customer does not own the order', async () => {
        mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder, userId: 'other-user' });

        await expect(service.findMyOrder('user-1', 'order-1')).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('allows a verified guest to read their own guest order', async () => {
        mockPrisma.order.findUnique.mockResolvedValue({
          ...baseOrder,
          userId: null,
          guestSessionId: 'guest-1',
        });

        const result = await service.findMyOrder(null, 'order-1', 'guest-1');

        expect(result.id).toBe('order-1');
      });
    });

    describe('related owner-scoped routes', () => {
      it('getTracking rejects anonymous callers', async () => {
        await expect(service.getTracking(null, 'order-1')).rejects.toThrow(UnauthorizedException);
        expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
      });

      it('repurchaseOrder rejects anonymous callers', async () => {
        await expect(service.repurchaseOrder(null, 'order-1')).rejects.toThrow(
          UnauthorizedException,
        );
        expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
      });

      it('initiateReturn rejects anonymous callers', async () => {
        await expect(
          service.initiateReturn(null, 'order-1', { reason: 'test', itemIds: ['item-1'] }),
        ).rejects.toThrow(UnauthorizedException);
        expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
      });

      it('applyCoupon rejects anonymous callers', async () => {
        await expect(
          service.applyCoupon(null, { code: 'SAVE10', cartTotal: 1000 }),
        ).rejects.toThrow(UnauthorizedException);
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      });

      it('getInvoicePdf rejects anonymous callers', async () => {
        await expect(service.getInvoicePdf('order-1', null)).rejects.toThrow(UnauthorizedException);
        expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
      });
    });
  });
});
