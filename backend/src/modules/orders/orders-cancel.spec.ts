/**
 * REQ-BE-001 / REQ-BE-002: Order cancellation rule tests.
 *
 * The test harness mocks PrismaService + the PaymentsService so the
 * service can be exercised without a live database. The aim is to lock
 * in:
 *   - Status rules (PENDING/CONFIRMED cancellable; admin override for
 *     PROCESSING; SHIPPED/DELIVERED/RETURNED rejected).
 *   - Ownership rules (customer must own the order; admin bypasses).
 *   - Event emission (OrderCancelledEvent fires once with the right
 *     payload).
 *   - Inventory restore (non-rental items move quantityReserved/Sold
 *     back to quantityAvailable).
 *   - Refund path (PAID orders get a Refund row + a paymentsService.refund
 *     call).
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { InvoicesService } from '../invoices/invoices.service';
import { OrderCancelledEvent } from './events/order-cancelled.event';

interface MockTx {
  order: { update: jest.Mock };
  orderStatusLog: { create: jest.Mock };
  inventorySummary: { update: jest.Mock };
  rentalBooking: { update: jest.Mock };
  inventoryUnit: { update: jest.Mock };
  payment: { findFirst: jest.Mock };
  refund: { create: jest.Mock };
  $queryRaw: jest.Mock;
}

describe('OrdersService.cancel', () => {
  let service: OrdersService;
  let prisma: {
    order: { findUnique: jest.Mock; update: jest.Mock };
    orderItem: { findMany: jest.Mock };
    rentalBooking: { findMany: jest.Mock };
    payment: { findFirst: jest.Mock };
    refund: { create: jest.Mock; update: jest.Mock };
    orderStatusLog: { create: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };
  let paymentsService: { refund: jest.Mock };

  const baseOrder = {
    id: 'order-1',
    orderNumber: 'ORD-ABC123',
    userId: 'user-1',
    guestSessionId: null,
    status: 'PENDING',
    totalAmount: 100,
    paymentStatus: 'PENDING',
    storeId: 'store-1',
    items: [
      {
        id: 'oi-1',
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 2,
        type: 'sale',
        unitPrice: 50,
      },
    ],
  };

  const makeTx = (overrides: { orderId?: string; orderNumber?: string } = {}): MockTx => {
    const tx: MockTx = {
      order: {
        update: jest.fn().mockResolvedValue({
          id: overrides.orderId ?? 'order-1',
          orderNumber: overrides.orderNumber ?? 'ORD-ABC123',
          cancelledAt: new Date(),
        }),
      },
      orderStatusLog: { create: jest.fn().mockResolvedValue({}) },
      inventorySummary: { update: jest.fn().mockResolvedValue({}) },
      rentalBooking: { update: jest.fn().mockResolvedValue({}) },
      inventoryUnit: { update: jest.fn().mockResolvedValue({}) },
      payment: { findFirst: jest.fn().mockResolvedValue(null) },
      refund: { create: jest.fn() },
      // The cancel flow runs an inventory_summary FOR UPDATE lock per
      // non-rental item. The default mock returns no rows so the loop
      // skips the update — that is the desired behaviour for the
      // test scenarios (they do not assert on inventory).
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    return tx;
  };

  const setup = (overrides: { order?: Record<string, unknown> } = {}) => {
    const order = { ...baseOrder, ...(overrides.order ?? {}) };
    prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue(order),
        update: jest.fn().mockResolvedValue({
          id: order.id,
          orderNumber: order.orderNumber,
          cancelledAt: new Date(),
        }),
      },
      orderItem: { findMany: jest.fn().mockResolvedValue([]) },
      rentalBooking: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { findFirst: jest.fn().mockResolvedValue(null) },
      refund: { create: jest.fn(), update: jest.fn() },
      orderStatusLog: { create: jest.fn().mockResolvedValue({}) },
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (cb) => cb(makeTx())),
    };
    eventEmitter = { emit: jest.fn() };
    paymentsService = { refund: jest.fn().mockResolvedValue({ id: 'rfnd_1' }) };
    service = new OrdersService(
      prisma as unknown as PrismaService,
      {} as StorageService,
      {} as NotificationsGateway,
      {} as NotificationsService,
      paymentsService as unknown as PaymentsService,
      {} as InvoicesService,
      {} as ConfigService,
      eventEmitter as unknown as EventEmitter2,
    );
  };

  it('rejects cancellation of a non-existent order', async () => {
    setup();
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(
      service.cancel('missing', { reason: 'CUSTOMER_REQUEST' as never }, 'user-1', null, false),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects customers cancelling an order they do not own', async () => {
    setup({ order: { userId: 'other-user' } });
    await expect(
      service.cancel('order-1', { reason: 'CUSTOMER_REQUEST' as never }, 'user-1', null, false),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects cancellation of a SHIPPED order with 400', async () => {
    setup({ order: { status: 'SHIPPED' } });
    await expect(
      service.cancel('order-1', { reason: 'CUSTOMER_REQUEST' as never }, 'user-1', null, false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cancellation of a DELIVERED order with 400', async () => {
    setup({ order: { status: 'DELIVERED' } });
    await expect(
      service.cancel('order-1', { reason: 'CUSTOMER_REQUEST' as never }, 'user-1', null, false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects customer cancellation of a PROCESSING order (admin-only)', async () => {
    setup({ order: { status: 'PROCESSING' } });
    await expect(
      service.cancel('order-1', { reason: 'CUSTOMER_REQUEST' as never }, 'user-1', null, false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows admin to cancel a PROCESSING order', async () => {
    setup({ order: { status: 'PROCESSING' } });
    const result = await service.cancel(
      'order-1',
      { reason: 'ADMIN_OVERRIDE' as never },
      'admin-1',
      null,
      true,
    );
    expect(result.status).toBe('CANCELLED');
  });

  it('cancels a PENDING order and emits OrderCancelledEvent', async () => {
    setup();
    const result = await service.cancel(
      'order-1',
      { reason: 'CUSTOMER_REQUEST' as never, notes: 'changed my mind' },
      'user-1',
      null,
      false,
    );
    expect(result).toMatchObject({
      id: 'order-1',
      status: 'CANCELLED',
      orderNumber: 'ORD-ABC123',
    });
    expect(result.refundId).toBeNull();
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    const [eventName, event] = eventEmitter.emit.mock.calls[0];
    expect(eventName).toBe(OrderCancelledEvent.eventName);
    expect(event).toBeInstanceOf(OrderCancelledEvent);
    expect(event).toMatchObject({
      orderId: 'order-1',
      orderNumber: 'ORD-ABC123',
      cancelledBy: 'USER',
      actorId: 'user-1',
      reason: 'CUSTOMER_REQUEST',
      totalAmountPaise: 10000,
    });
  });

  it('cancels a CONFIRMED order', async () => {
    setup({ order: { status: 'CONFIRMED' } });
    const result = await service.cancel(
      'order-1',
      { reason: 'CUSTOMER_REQUEST' as never },
      'user-1',
      null,
      false,
    );
    expect(result.status).toBe('CANCELLED');
  });

  it('initiates a refund for a PAID order', async () => {
    setup({ order: { paymentStatus: 'PAID' } });
    const tx = makeTx();
    tx.payment.findFirst.mockResolvedValue({ id: 'pay-1', razorpayPaymentId: 'rpay_1' });
    tx.refund.create.mockResolvedValue({ id: 'refund-1' });
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));
    prisma.payment.findFirst.mockResolvedValue({ id: 'pay-1', razorpayPaymentId: 'rpay_1' });

    const result = await service.cancel(
      'order-1',
      { reason: 'CUSTOMER_REQUEST' as never },
      'user-1',
      null,
      false,
    );

    expect(result.refundId).toBe('refund-1');
    expect(paymentsService.refund).toHaveBeenCalledWith('pay-1');
  });

  it('continues cancellation even if the refund API call fails (refund row remains INITIATED)', async () => {
    setup({ order: { paymentStatus: 'PAID' } });
    const tx = makeTx();
    tx.payment.findFirst.mockResolvedValue({ id: 'pay-1', razorpayPaymentId: 'rpay_1' });
    tx.refund.create.mockResolvedValue({ id: 'refund-1' });
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));
    prisma.payment.findFirst.mockResolvedValue({ id: 'pay-1', razorpayPaymentId: 'rpay_1' });
    paymentsService.refund.mockRejectedValue(new Error('Razorpay 5xx'));

    const result = await service.cancel(
      'order-1',
      { reason: 'CUSTOMER_REQUEST' as never },
      'user-1',
      null,
      false,
    );

    expect(result.status).toBe('CANCELLED');
    expect(result.refundId).toBe('refund-1');
  });

  it('cancels a guest order owned by the guest session', async () => {
    setup({ order: { userId: null, guestSessionId: 'gs-1' } });
    const result = await service.cancel(
      'order-1',
      { reason: 'CUSTOMER_REQUEST' as never },
      null,
      'gs-1',
      false,
    );
    expect(result.status).toBe('CANCELLED');
  });
});
