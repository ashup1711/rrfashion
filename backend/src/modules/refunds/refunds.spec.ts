/**
 * REQ-BE-008: Refunds list tests.
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RefundsService } from './refunds.service';

interface MockPrisma {
  order: { findUnique: jest.Mock };
  refund: { findMany: jest.Mock };
}

describe('RefundsService.listForOrder', () => {
  let service: RefundsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = {
      order: { findUnique: jest.fn() },
      refund: { findMany: jest.fn() },
    };
    service = new RefundsService(prisma as unknown as never);
  });

  it('rejects anonymous callers', async () => {
    await expect(service.listForOrder('order-1', null, null)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns 404 when the order does not exist', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.listForOrder('order-1', 'user-1', null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns 403 when the caller does not own the order', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'other-user',
      guestSessionId: null,
    });
    await expect(service.listForOrder('order-1', 'user-1', null)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns an empty list when the order has no refunds', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      guestSessionId: null,
    });
    prisma.refund.findMany.mockResolvedValue([]);
    const result = await service.listForOrder('order-1', 'user-1', null);
    expect(result.refunds).toEqual([]);
  });

  it('hides placeholder razorpayRefundId values from the response', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      guestSessionId: null,
    });
    prisma.refund.findMany.mockResolvedValue([
      {
        id: 'r-1',
        orderId: 'order-1',
        returnRequestId: null,
        amount: { toString: () => '99.50' },
        status: 'PROCESSED',
        reason: 'test',
        initiatedAt: new Date(),
        processedAt: new Date(),
        razorpayRefundId: 'pending-uuid',
      },
      {
        id: 'r-2',
        orderId: 'order-1',
        returnRequestId: null,
        amount: { toString: () => '50.00' },
        status: 'INITIATED',
        reason: null,
        initiatedAt: new Date(),
        processedAt: null,
        razorpayRefundId: 'rfnd_abc',
      },
    ]);
    const result = await service.listForOrder('order-1', 'user-1', null);
    expect(result.refunds[0].razorpayRefundId).toBeNull();
    expect(result.refunds[1].razorpayRefundId).toBe('rfnd_abc');
  });

  it('scopes a guest-order read by guestSessionId', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      userId: null,
      guestSessionId: 'gs-1',
    });
    prisma.refund.findMany.mockResolvedValue([]);
    const result = await service.listForOrder('order-1', null, 'gs-1');
    expect(result.refunds).toEqual([]);
  });
});
