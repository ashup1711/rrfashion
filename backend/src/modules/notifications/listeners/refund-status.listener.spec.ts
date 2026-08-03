import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { RefundStatusListener } from './refund-status.listener';
import { RefundStatusChangedEvent } from '../../payments/events/refund-status-changed.event';

describe('RefundStatusListener (REQ-NOTIF-001)', () => {
  let listener: RefundStatusListener;
  let queue: { add: jest.Mock };

  const mockPrisma = {
    refund: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundStatusListener,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'BullQueue_notifications', useValue: { add: jest.fn() } },
      ],
    }).compile();

    listener = module.get<RefundStatusListener>(RefundStatusListener);
    queue = module.get('BullQueue_notifications');
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.notification.create.mockResolvedValue({ id: 'notification-1' });
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('creates EMAIL + SMS notifications for a processed refund', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue({
      id: 'refund-1',
      order: {
        orderNumber: 'ORD-1001',
        userId: 'user-1',
        guestSessionId: null,
        user: { id: 'user-1', email: 'customer@example.com', phone: '9876543210' },
      },
    });

    const event = new RefundStatusChangedEvent({
      refundId: 'refund-1',
      orderId: 'order-1',
      status: 'PROCESSED',
      amount: 1999.5,
    });

    await listener.handleRefundStatusChanged(event);

    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'refund_status',
          channel: 'EMAIL',
          status: 'PENDING',
          title: 'Refund Processed',
        }),
      }),
    );
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ channel: 'SMS' }),
      }),
    );
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledWith('send-notification', {
      notificationId: 'notification-1',
    });
  });

  it('uses the failed template for a failed refund', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue({
      id: 'refund-2',
      order: {
        orderNumber: 'ORD-1002',
        userId: 'user-1',
        guestSessionId: null,
        user: { id: 'user-1', email: 'customer@example.com', phone: '9876543210' },
      },
    });

    await listener.handleRefundStatusChanged(
      new RefundStatusChangedEvent({
        refundId: 'refund-2',
        orderId: 'order-2',
        status: 'FAILED',
        amount: 500,
      }),
    );

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Refund Failed' }),
      }),
    );
  });

  it('skips when the refund row is missing', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue(null);

    await listener.handleRefundStatusChanged(
      new RefundStatusChangedEvent({
        refundId: 'missing',
        orderId: 'order-3',
        status: 'PROCESSED',
        amount: 100,
      }),
    );

    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('skips guest-session-only orders with no resolvable user (no schema change)', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue({
      id: 'refund-3',
      order: {
        orderNumber: 'ORD-1003',
        userId: null,
        guestSessionId: 'guest-session-1',
        user: null,
      },
    });

    await listener.handleRefundStatusChanged(
      new RefundStatusChangedEvent({
        refundId: 'refund-3',
        orderId: 'order-3',
        status: 'PROCESSED',
        amount: 100,
      }),
    );

    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });
});
