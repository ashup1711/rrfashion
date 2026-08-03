/**
 * REQ-BE-006: Returns service create() tests.
 *
 * Focus: ownership, status validation, and per-item quantity bounds.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

interface MockTx {
  returnRequest: { create: jest.Mock };
  orderStatusLog: { create: jest.Mock };
}

describe('ReturnsService.create', () => {
  let service: ReturnsService;
  let prisma: {
    order: { findUnique: jest.Mock };
    returnRequest: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const baseOrder = {
    id: 'order-1',
    userId: 'user-1',
    guestSessionId: null,
    status: 'DELIVERED',
    items: [
      { id: 'oi-1', productId: 'prod-1', variantId: 'var-1', quantity: 2 },
      { id: 'oi-2', productId: 'prod-2', variantId: 'var-2', quantity: 1 },
    ],
  };

  const setup = (order: Record<string, unknown> = baseOrder) => {
    prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      returnRequest: { create: jest.fn().mockResolvedValue({ id: 'rr-1', items: [] }) },
      $transaction: jest.fn(async (cb: (tx: MockTx) => Promise<unknown>) =>
        cb({
          returnRequest: { create: prisma.returnRequest.create },
          orderStatusLog: { create: jest.fn().mockResolvedValue({}) },
        }),
      ),
    };
    service = new ReturnsService(
      prisma as unknown as PrismaService,
      {} as PaymentsService,
      {} as EventEmitter2,
    );
  };

  it('rejects anonymous callers', async () => {
    setup();
    await expect(
      service.create('order-1', null, null, {
        items: [{ orderItemId: 'oi-1', quantity: 1, reason: 'OTHER' as never }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when the order does not exist', async () => {
    setup();
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(
      service.create('order-1', 'user-1', null, {
        items: [{ orderItemId: 'oi-1', quantity: 1, reason: 'OTHER' as never }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects callers who do not own the order', async () => {
    setup({ ...baseOrder, userId: 'other-user' });
    await expect(
      service.create('order-1', 'user-1', null, {
        items: [{ orderItemId: 'oi-1', quantity: 1, reason: 'OTHER' as never }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects returns for orders that are not delivered', async () => {
    setup({ ...baseOrder, status: 'SHIPPED' });
    await expect(
      service.create('order-1', 'user-1', null, {
        items: [{ orderItemId: 'oi-1', quantity: 1, reason: 'OTHER' as never }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects items that do not belong to the order', async () => {
    setup();
    await expect(
      service.create('order-1', 'user-1', null, {
        items: [{ orderItemId: 'oi-foreign', quantity: 1, reason: 'OTHER' as never }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects quantities that exceed the purchased amount', async () => {
    setup();
    await expect(
      service.create('order-1', 'user-1', null, {
        items: [{ orderItemId: 'oi-1', quantity: 99, reason: 'OTHER' as never }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a return request with the validated items', async () => {
    setup();
    const result = await service.create('order-1', 'user-1', null, {
      items: [
        { orderItemId: 'oi-1', quantity: 1, reason: 'SIZE_ISSUE' as never },
        { orderItemId: 'oi-2', quantity: 1, reason: 'DEFECT' as never },
      ],
    });
    expect(result.returnRequest.id).toBe('rr-1');
    expect(prisma.returnRequest.create).toHaveBeenCalledTimes(1);
    const call = prisma.returnRequest.create.mock.calls[0][0];
    expect(call.data.items.create).toHaveLength(2);
    expect(call.data.items.create[0]).toMatchObject({
      orderItemId: 'oi-1',
      quantity: 1,
      reason: 'SIZE_ISSUE',
    });
  });
});
