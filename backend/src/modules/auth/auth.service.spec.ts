import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { SmsService } from '../notifications/providers/sms.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
    verify: jest.fn(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    notification: {
      updateMany: jest.fn(),
    },
    walletTransaction: {
      updateMany: jest.fn(),
    },
    wishlist: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    cart: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    otpVerification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    guestSession: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCartService = {
    addItem: jest.fn(),
    mergeGuestCartIntoUserCart: jest.fn().mockResolvedValue({ merged: true, mergedItems: 0 }),
    findCart: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                'auth.jwtSecret': 'test-secret',
                'auth.jwtExpiresIn': '15m',
                'auth.refreshExpiresInMs': 604800000,
                'auth.bcryptSaltRounds': 10,
                'auth.otpTtlMs': 600000,
                'auth.otpHashSecret': 'test-otp-secret',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
        {
          provide: SmsService,
          useValue: {
            send: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockJwtService.sign.mockReturnValue('test-token');
    mockJwtService.verify.mockReturnValue(undefined);
    mockCartService.addItem.mockResolvedValue(undefined);
    mockCartService.mergeGuestCartIntoUserCart.mockResolvedValue({ merged: true, mergedItems: 0 });
    mockCartService.findCart.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have prisma service injected', () => {
    expect(prisma).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'CUSTOMER',
        isActive: true,
        isGuest: false,
        passwordHash: 'hashed',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });

      const result = await service.register({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('test-token');
      expect(result.mergedGuestSession).toBeUndefined();
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'test@test.com' });

      await expect(
        service.register({
          email: 'test@test.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should merge guest account when guestId is provided', async () => {
      const guestUser = {
        id: 'guest-1',
        email: 'guest@test.com',
        firstName: 'Guest',
        lastName: 'User',
        isGuest: true,
        isActive: true,
      };
      mockPrisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(guestUser);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'CUSTOMER',
        isActive: true,
        isGuest: false,
        passwordHash: 'hashed',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          order: {
            findMany: jest.fn().mockResolvedValue([]),
            updateMany: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'cart', items: [] }),
          },
          cartItem: {
            create: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
          },
          refreshToken: { updateMany: jest.fn() },
          notification: { updateMany: jest.fn() },
          walletTransaction: { updateMany: jest.fn() },
          user: { update: jest.fn() },
          wishlist: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn(),
            deleteMany: jest.fn(),
          },
        });
      });

      const result = await service.register({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        guestId: 'guest-1',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(mockCartService.mergeGuestCartIntoUserCart).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@test.com',
      passwordHash: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      role: 'CUSTOMER',
      isActive: true,
      isGuest: false,
      deletedAt: null,
    };

    it('should login successfully with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@test.com',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('test-token');
      expect(result.mergedGuestSession).toBeUndefined();
    });

    it('should merge guest account when guestId is provided on login', async () => {
      const guestUser = {
        id: 'guest-1',
        email: 'guest@test.com',
        firstName: 'Guest',
        lastName: 'User',
        isGuest: true,
        isActive: true,
      };
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(guestUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          order: {
            findMany: jest.fn().mockResolvedValue([]),
            updateMany: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'cart', items: [] }),
          },
          cartItem: {
            create: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
          },
          refreshToken: { updateMany: jest.fn() },
          notification: { updateMany: jest.fn() },
          walletTransaction: { updateMany: jest.fn() },
          user: { update: jest.fn() },
          wishlist: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn(),
            deleteMany: jest.fn(),
          },
        });
      });

      const result = await service.login({
        email: 'test@test.com',
        password: 'Password123!',
        guestId: 'guest-1',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(mockCartService.mergeGuestCartIntoUserCart).toHaveBeenCalled();
    });
  });

  describe('migrateGuestSessionToUser', () => {
    it('moves cart and wishlist items from a valid session to the user', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'guest-1',
              cartItems: [
                {
                  productId: 'p1',
                  variantId: 'v1',
                  quantity: 2,
                  type: 'sale',
                  rentStart: null,
                  rentEnd: null,
                },
              ],
              wishlistItems: [
                { variantId: 'vw1', notifyOnRestock: false, notifyOnPriceDrop: false },
                { variantId: 'vw2', notifyOnRestock: true, notifyOnPriceDrop: false },
              ],
            }),
            delete: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'user-cart' }),
          },
          cartItem: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
            update: jest.fn(),
          },
          wishlist: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn(),
          },
        });
      });

      const result = await service.migrateGuestSessionToUser('guest-1', 'user-1');

      expect(result.cartItems).toBe(1);
      expect(result.wishlistItems).toBe(2);
    });

    it('returns 0/0 when the session does not exist', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue(null),
            delete: jest.fn(),
          },
          cart: { findUnique: jest.fn(), create: jest.fn() },
          cartItem: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
          wishlist: { findMany: jest.fn(), createMany: jest.fn() },
        });
      });

      const result = await service.migrateGuestSessionToUser('missing', 'user-1');

      expect(result).toEqual({ cartItems: 0, wishlistItems: 0 });
    });

    it('returns 0/0 for an empty session', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'guest-1',
              cartItems: [],
              wishlistItems: [],
            }),
            delete: jest.fn(),
          },
          cart: { findUnique: jest.fn(), create: jest.fn() },
          cartItem: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
          wishlist: { findMany: jest.fn(), createMany: jest.fn() },
        });
      });

      const result = await service.migrateGuestSessionToUser('guest-1', 'user-1');

      expect(result).toEqual({ cartItems: 0, wishlistItems: 0 });
    });

    it('merges quantities when user already has the same cart variant', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'guest-1',
              cartItems: [
                {
                  productId: 'p1',
                  variantId: 'v1',
                  quantity: 2,
                  type: 'sale',
                  rentStart: null,
                  rentEnd: null,
                },
              ],
              wishlistItems: [],
            }),
            delete: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue({ id: 'user-cart' }),
            create: jest.fn(),
          },
          cartItem: {
            findFirst: jest.fn().mockResolvedValue({ id: 'existing', quantity: 1 }),
            create: jest.fn(),
            update: jest.fn(),
          },
          wishlist: { findMany: jest.fn(), createMany: jest.fn() },
        });
      });

      const result = await service.migrateGuestSessionToUser('guest-1', 'user-1');

      expect(result.cartItems).toBe(1);
    });

    it('skips wishlist items that already exist for the user', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'guest-1',
              cartItems: [],
              wishlistItems: [
                { variantId: 'vw1', notifyOnRestock: false, notifyOnPriceDrop: false },
                { variantId: 'vw2', notifyOnRestock: true, notifyOnPriceDrop: false },
              ],
            }),
            delete: jest.fn(),
          },
          cart: { findUnique: jest.fn(), create: jest.fn() },
          cartItem: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
          wishlist: {
            findMany: jest.fn().mockResolvedValue([{ variantId: 'vw1' }]),
            createMany: jest.fn(),
          },
        });
      });

      const result = await service.migrateGuestSessionToUser('guest-1', 'user-1');

      expect(result.wishlistItems).toBe(1);
    });

    it('persists cart items with rentStart and rentEnd when present', async () => {
      const rentStart = new Date('2026-08-01');
      const rentEnd = new Date('2026-08-05');
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'guest-1',
              cartItems: [
                {
                  productId: 'p1',
                  variantId: 'v1',
                  quantity: 1,
                  type: 'rent',
                  rentStart,
                  rentEnd,
                },
              ],
              wishlistItems: [],
            }),
            delete: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'user-cart' }),
          },
          cartItem: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
            update: jest.fn(),
          },
          wishlist: { findMany: jest.fn(), createMany: jest.fn() },
        });
      });

      const result = await service.migrateGuestSessionToUser('guest-1', 'user-1');

      expect(result.cartItems).toBe(1);
    });
  });

  describe('login with guestSessionId', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@test.com',
      passwordHash: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      role: 'CUSTOMER',
      isActive: true,
      isGuest: false,
      deletedAt: null,
    };

    it('migrates the guest session and returns the counts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'guest-session-1',
              cartItems: [
                {
                  productId: 'p1',
                  variantId: 'v1',
                  quantity: 1,
                  type: 'sale',
                  rentStart: null,
                  rentEnd: null,
                },
              ],
              wishlistItems: [
                { variantId: 'vw1', notifyOnRestock: false, notifyOnPriceDrop: false },
              ],
            }),
            delete: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'user-cart' }),
          },
          cartItem: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
            update: jest.fn(),
          },
          wishlist: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn(),
          },
        });
      });

      const result = await service.login({
        email: 'test@test.com',
        password: 'Password123!',
        guestSessionId: 'guest-session-1',
      });

      expect(result.mergedGuestSession).toEqual({ cartItems: 1, wishlistItems: 1 });
    });
  });

  describe('mergeGuestAccount (legacy)', () => {
    const guestUser = {
      id: 'guest-1',
      email: 'guest-guest-1@rrfashion.guest',
      firstName: 'Guest',
      lastName: 'User',
      isGuest: true,
      isActive: true,
      deletedAt: null,
      passwordHash: '',
      phone: null,
    };

    it('should merge orders, cart, wishlist and soft-delete guest', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(guestUser);

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          order: {
            findMany: jest.fn().mockResolvedValue([{ id: 'order-1' }, { id: 'order-2' }]),
            updateMany: jest.fn(),
          },
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'user-cart', items: [] }),
          },
          cartItem: {
            create: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
          },
          refreshToken: { updateMany: jest.fn() },
          notification: { updateMany: jest.fn() },
          walletTransaction: { updateMany: jest.fn() },
          user: { update: jest.fn() },
          wishlist: {
            findMany: jest
              .fn()
              .mockResolvedValueOnce([
                { variantId: 'v1', notifyOnRestock: false, notifyOnPriceDrop: false },
                { variantId: 'v2', notifyOnRestock: false, notifyOnPriceDrop: false },
              ])
              .mockResolvedValueOnce([{ variantId: 'v1' }]),
            createMany: jest.fn(),
            deleteMany: jest.fn(),
          },
        };
        return cb(tx);
      });

      const result = await service.mergeGuestAccount('guest-1', 'user-1');

      expect(result.mergedOrders).toBe(2);
      expect(result.mergedCart).toBe(true);
      expect(result.message).toBe('Guest account merged successfully');
    });

    it('should throw NotFoundException if guest not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.mergeGuestAccount('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user is not a guest', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...guestUser, isGuest: false });

      await expect(service.mergeGuestAccount('guest-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
