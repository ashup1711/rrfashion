import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CartAbandonmentProcessor,
  CART_ABANDONMENT_JOB_NAME,
} from './processors/cart-abandonment.processor';
import { CartAbandonedEvent } from './events/cart-abandoned.event';

describe('CartAbandonmentProcessor (REQ-BE-004)', () => {
  let processor: CartAbandonmentProcessor;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let config: ConfigService;
  let queue: { add: jest.Mock };

  const mockPrisma = {
    cart: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    guestCartItem: {
      count: jest.fn(),
    },
    guestSession: {
      findMany: jest.fn(),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartAbandonmentProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('0 */6 * * *') } },
        { provide: 'BullQueue_cart-abandonment', useValue: { add: jest.fn() } },
      ],
    }).compile();

    processor = module.get<CartAbandonmentProcessor>(CartAbandonmentProcessor);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    config = module.get<ConfigService>(ConfigService);
    queue = module.get('BullQueue_cart-abandonment');
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(config, 'get').mockReturnValue('0 */6 * * *');
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('registers a stable repeatable job on module init', async () => {
    await processor.onModuleInit();

    expect(queue.add).toHaveBeenCalledWith(
      CART_ABANDONMENT_JOB_NAME,
      {},
      {
        repeat: { pattern: '0 */6 * * *', jobId: CART_ABANDONMENT_JOB_NAME },
      },
    );
  });

  it('marks stale user carts and stale guest carts abandoned and emits events', async () => {
    mockPrisma.cart.findMany
      .mockResolvedValueOnce([
        {
          id: 'user-cart-1',
          userId: 'user-1',
          items: [{ variantId: 'v1', quantity: 2, type: 'sale' }],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'guest-cart-1',
          userId: null,
          guestSessionId: 'guest-session-1',
        },
      ]);
    mockPrisma.guestCartItem.count.mockResolvedValue(2);
    mockPrisma.cart.update.mockResolvedValue({});
    mockPrisma.guestSession.findMany.mockResolvedValue([]);

    const result = await processor.runAbandonmentScan();

    expect(result).toEqual({
      userCartsMarked: 1,
      guestCartsMarked: 1,
      guestSessionsTracked: 0,
      totalCartsMarked: 2,
    });
    expect(mockPrisma.cart.update).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      CartAbandonedEvent.eventName,
      expect.objectContaining({
        cartId: 'user-cart-1',
        userId: 'user-1',
        itemCount: 2,
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      CartAbandonedEvent.eventName,
      expect.objectContaining({
        cartId: 'guest-cart-1',
        guestSessionId: 'guest-session-1',
      }),
    );
  });

  it('skips stale guest tracking rows that no longer have items', async () => {
    mockPrisma.cart.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'empty-guest-cart',
        userId: null,
        guestSessionId: 'dead-session',
      },
    ]);
    mockPrisma.guestCartItem.count.mockResolvedValue(0);
    mockPrisma.guestSession.findMany.mockResolvedValue([]);

    const result = await processor.runAbandonmentScan();

    expect(result.guestCartsMarked).toBe(0);
    expect(mockPrisma.cart.update).not.toHaveBeenCalled();
  });

  it('materializes tracking carts for abandoned legacy guest sessions', async () => {
    mockPrisma.cart.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockPrisma.guestSession.findMany.mockResolvedValue([
      {
        id: 'legacy-session-1',
        cartItems: [{ variantId: 'v2', quantity: 1, type: 'rent' }],
      },
    ]);
    mockPrisma.cart.findUnique.mockResolvedValue(null);
    mockPrisma.cart.create.mockResolvedValue({ id: 'tracked-cart-1' });

    const result = await processor.runAbandonmentScan();

    expect(result.guestSessionsTracked).toBe(1);
    expect(mockPrisma.cart.create).toHaveBeenCalledWith({
      data: { guestSessionId: 'legacy-session-1', abandonedAt: expect.any(Date) },
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      CartAbandonedEvent.eventName,
      expect.objectContaining({ cartId: 'legacy-session-1', itemCount: 1 }),
    );
  });

  it('does not double-track sessions that already have a Cart row', async () => {
    mockPrisma.cart.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockPrisma.guestSession.findMany.mockResolvedValue([
      {
        id: 'already-tracked-session',
        cartItems: [{ variantId: 'v2', quantity: 1, type: 'sale' }],
      },
    ]);
    mockPrisma.cart.findUnique.mockResolvedValue({ id: 'existing-cart' });

    const result = await processor.runAbandonmentScan();

    expect(result.guestSessionsTracked).toBe(0);
    expect(mockPrisma.cart.create).not.toHaveBeenCalled();
  });

  it('should have prisma injected', () => {
    expect(prisma).toBeDefined();
  });
});
