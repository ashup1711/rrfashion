import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { GuestSessionService } from '../guest/guest-session.service';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: PrismaService;

  const mockPrisma = {
    wishlist: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    guestWishlistItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    guestSession: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCartService = {
    addItem: jest.fn(),
  };

  const mockGuestSessionService = {
    validate: jest.fn(),
    touch: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
        {
          provide: GuestSessionService,
          useValue: mockGuestSessionService,
        },
      ],
    }).compile();
    service = module.get<WishlistService>(WishlistService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockGuestSessionService.validate.mockResolvedValue({
      ok: true,
      session: {
        id: 'guest-1',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastActivityAt: new Date(),
        createdAt: new Date(),
      },
    });
    mockGuestSessionService.touch.mockResolvedValue(undefined);
    mockCartService.addItem.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have prisma service injected', () => {
    expect(prisma).toBeDefined();
  });

  describe('findAll', () => {
    it('returns user wishlist items', async () => {
      mockPrisma.wishlist.findMany.mockResolvedValue([
        { id: 'w-1', userId: 'user-1', variantId: 'v-1' },
      ]);

      const result = await service.findAll({ userId: 'user-1' });

      expect(result).toHaveLength(1);
    });

    it('returns empty array for new guest session', async () => {
      mockPrisma.guestWishlistItem.findMany.mockResolvedValue([]);

      const result = await service.findAll({ guestSessionId: 'guest-1' });

      expect(result).toEqual([]);
    });

    it('returns guest wishlist items', async () => {
      mockPrisma.guestWishlistItem.findMany.mockResolvedValue([
        { id: 'gw-1', guestSessionId: 'guest-1', variantId: 'v-1' },
      ]);

      const result = await service.findAll({ guestSessionId: 'guest-1' });

      expect(result).toHaveLength(1);
    });

    it('throws BadRequestException for invalid guest session', async () => {
      mockGuestSessionService.validate.mockResolvedValue({
        ok: false,
        reason: 'expired',
      });

      await expect(service.findAll({ guestSessionId: 'missing' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when neither userId nor guestSessionId is given', async () => {
      await expect(service.findAll({})).rejects.toThrow(BadRequestException);
    });
  });

  describe('add', () => {
    it('creates a new user wishlist entry', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue(null);
      mockPrisma.wishlist.create.mockResolvedValue({ id: 'w-1' });

      await service.add({ userId: 'user-1' }, { variantId: 'v-1' });

      expect(mockPrisma.wishlist.create).toHaveBeenCalled();
    });

    it('updates existing user wishlist entry', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue({
        id: 'w-1',
        notifyOnRestock: false,
        notifyOnPriceDrop: false,
      });
      mockPrisma.wishlist.update.mockResolvedValue({ id: 'w-1' });

      await service.add({ userId: 'user-1' }, { variantId: 'v-1', notifyOnRestock: true });

      expect(mockPrisma.wishlist.update).toHaveBeenCalled();
      expect(mockPrisma.wishlist.create).not.toHaveBeenCalled();
    });

    it('creates a new guest wishlist entry', async () => {
      mockPrisma.guestWishlistItem.findUnique.mockResolvedValue(null);
      mockPrisma.guestWishlistItem.create.mockResolvedValue({ id: 'gw-1' });

      await service.add({ guestSessionId: 'guest-1' }, { variantId: 'v-1' });

      expect(mockPrisma.guestWishlistItem.create).toHaveBeenCalledWith({
        data: {
          guestSessionId: 'guest-1',
          variantId: 'v-1',
          notifyOnRestock: false,
          notifyOnPriceDrop: false,
        },
        include: expect.any(Object),
      });
    });

    it('updates existing guest wishlist entry', async () => {
      mockPrisma.guestWishlistItem.findUnique.mockResolvedValue({
        id: 'gw-1',
        notifyOnRestock: false,
        notifyOnPriceDrop: false,
      });
      mockPrisma.guestWishlistItem.update.mockResolvedValue({ id: 'gw-1' });

      await service.add(
        { guestSessionId: 'guest-1' },
        { variantId: 'v-1', notifyOnPriceDrop: true },
      );

      expect(mockPrisma.guestWishlistItem.update).toHaveBeenCalled();
      expect(mockPrisma.guestWishlistItem.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes user wishlist entry', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1' });
      mockPrisma.wishlist.delete.mockResolvedValue({});

      const result = await service.remove({ userId: 'user-1' }, 'v-1');

      expect(result).toEqual({ message: 'Removed from wishlist' });
    });

    it('throws NotFoundException for missing user wishlist entry', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(service.remove({ userId: 'user-1' }, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('removes guest wishlist entry', async () => {
      mockPrisma.guestWishlistItem.findUnique.mockResolvedValue({ id: 'gw-1' });
      mockPrisma.guestWishlistItem.delete.mockResolvedValue({});

      const result = await service.remove({ guestSessionId: 'guest-1' }, 'v-1');

      expect(result).toEqual({ message: 'Removed from wishlist' });
    });

    it('throws NotFoundException for missing guest wishlist entry', async () => {
      mockPrisma.guestWishlistItem.findUnique.mockResolvedValue(null);

      await expect(service.remove({ guestSessionId: 'guest-1' }, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('merge (guest session based)', () => {
    it('moves guest wishlist items to user wishlist and deletes the session', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'guest-1',
              wishlistItems: [
                { variantId: 'v-1', notifyOnRestock: true, notifyOnPriceDrop: false },
                { variantId: 'v-2', notifyOnRestock: false, notifyOnPriceDrop: true },
              ],
            }),
            delete: jest.fn(),
          },
          wishlist: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn(),
          },
        });
      });

      const result = await service.merge({
        userId: 'user-1',
        guestSessionId: 'guest-1',
      });

      expect(result.merged).toBe(2);
      expect(result.skipped).toBe(0);
    });

    it('skips items already in user wishlist', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'guest-1',
              wishlistItems: [
                { variantId: 'v-1', notifyOnRestock: false, notifyOnPriceDrop: false },
                { variantId: 'v-2', notifyOnRestock: false, notifyOnPriceDrop: false },
              ],
            }),
            delete: jest.fn(),
          },
          wishlist: {
            findMany: jest.fn().mockResolvedValue([{ variantId: 'v-1' }]),
            createMany: jest.fn(),
          },
        });
      });

      const result = await service.merge({
        userId: 'user-1',
        guestSessionId: 'guest-1',
      });

      expect(result.merged).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('returns 0/0 when guest session has no items', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'guest-1',
              wishlistItems: [],
            }),
            delete: jest.fn(),
          },
          wishlist: {
            findMany: jest.fn(),
            createMany: jest.fn(),
          },
        });
      });

      const result = await service.merge({
        userId: 'user-1',
        guestSessionId: 'guest-1',
      });

      expect(result.merged).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('throws BadRequestException without guestSessionId or userId', async () => {
      await expect(service.merge({ userId: 'user-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('addAllToCart', () => {
    it('returns 0/0 for empty user wishlist', async () => {
      mockPrisma.wishlist.findMany.mockResolvedValue([]);

      const result = await service.addAllToCart({ userId: 'user-1' });

      expect(result).toEqual({ added: 0, skipped: 0, unavailable: [] });
    });

    it('returns 0/0 for empty guest wishlist', async () => {
      mockPrisma.guestWishlistItem.findMany.mockResolvedValue([]);

      const result = await service.addAllToCart({ guestSessionId: 'guest-1' });

      expect(result).toEqual({ added: 0, skipped: 0, unavailable: [] });
    });

    it('adds available user wishlist items to cart', async () => {
      mockPrisma.wishlist.findMany.mockResolvedValue([
        {
          variantId: 'v-1',
          variant: {
            isActive: true,
            deletedAt: null,
            product: { id: 'p-1', name: 'Test', isActive: true },
          },
        },
      ]);

      const result = await service.addAllToCart({ userId: 'user-1' });

      expect(result.added).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockCartService.addItem).toHaveBeenCalledWith(
        { userId: 'user-1' },
        { variantId: 'v-1', quantity: 1, type: 'sale' },
      );
    });

    it('skips unavailable guest wishlist items', async () => {
      mockPrisma.guestWishlistItem.findMany.mockResolvedValue([
        {
          variantId: 'v-1',
          variant: {
            isActive: false,
            deletedAt: null,
            product: { id: 'p-1', name: 'Test', isActive: true },
          },
        },
      ]);

      const result = await service.addAllToCart({ guestSessionId: 'guest-1' });

      expect(result.added).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.unavailable).toEqual([{ variantId: 'v-1', reason: 'variant_unavailable' }]);
    });

    it('skips items with discontinued product', async () => {
      mockPrisma.wishlist.findMany.mockResolvedValue([
        {
          variantId: 'v-1',
          variant: {
            isActive: true,
            deletedAt: null,
            product: { id: 'p-1', name: 'Test', isActive: false },
          },
        },
      ]);

      const result = await service.addAllToCart({ userId: 'user-1' });

      expect(result.added).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.unavailable[0].reason).toBe('product_discontinued');
    });

    it('records failed add as unavailable', async () => {
      mockPrisma.wishlist.findMany.mockResolvedValue([
        {
          variantId: 'v-1',
          variant: {
            isActive: true,
            deletedAt: null,
            product: { id: 'p-1', name: 'Test', isActive: true },
          },
        },
      ]);
      mockCartService.addItem.mockRejectedValue(new Error('boom'));

      const result = await service.addAllToCart({ userId: 'user-1' });

      expect(result.added).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.unavailable[0].reason).toBe('failed_to_add');
    });
  });
});
