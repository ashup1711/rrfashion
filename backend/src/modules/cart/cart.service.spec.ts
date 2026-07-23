import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CartService } from './cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestSessionService } from '../guest/guest-session.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;
  let guestSessionService: GuestSessionService;

  const mockPrisma = {
    cart: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    cartItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
    },
    guestSession: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    guestCartItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockGuestSessionService = {
    validate: jest.fn(),
    touch: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: GuestSessionService,
          useValue: mockGuestSessionService,
        },
      ],
    }).compile();
    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);
    guestSessionService = module.get<GuestSessionService>(GuestSessionService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockGuestSessionService.validate.mockResolvedValue({
      ok: true,
      session: { id: 'guest-1', expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
    });
    mockGuestSessionService.touch.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have prisma service injected', () => {
    expect(prisma).toBeDefined();
  });

  it('should have guest session service injected', () => {
    expect(guestSessionService).toBeDefined();
  });

  describe('findCart - user', () => {
    it('should return existing cart', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      };
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.findCart({ userId: 'user-1' });

      expect(result.id).toBe('cart-1');
      expect(result.itemCount).toBe(0);
    });

    it('should create a cart if not exists', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);
      mockPrisma.cart.create.mockResolvedValue({
        id: 'cart-new',
        userId: 'user-1',
        items: [],
      });

      const result = await service.findCart({ userId: 'user-1' });

      expect(result.id).toBe('cart-new');
      expect(mockPrisma.cart.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
        include: expect.any(Object),
      });
    });
  });

  describe('findCart - guest', () => {
    it('should return empty cart for new guest session', async () => {
      mockPrisma.guestCartItem.findMany.mockResolvedValue([]);

      const result = await service.findCart({ guestSessionId: 'guest-1' });

      expect(result.id).toBe('guest-1');
      expect(result.items).toEqual([]);
      expect(result.itemCount).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should return formatted cart for guest with items', async () => {
      mockPrisma.guestCartItem.findMany.mockResolvedValue([
        {
          id: 'gci-1',
          guestSessionId: 'guest-1',
          productId: 'p1',
          variantId: 'v1',
          quantity: 2,
          type: 'sale',
          product: {
            id: 'p1',
            name: 'Test',
            slug: 'test',
            images: [],
            basePrice: 100,
            salePrice: null,
          },
          variant: {
            id: 'v1',
            size: 'M',
            color: 'Red',
            sku: 'SKU-1',
            salePrice: null,
          },
        },
      ]);

      const result = await service.findCart({ guestSessionId: 'guest-1' });

      expect(result.id).toBe('guest-1');
      expect(result.itemCount).toBe(2);
      expect(result.total).toBe(200);
    });

    it('should throw BadRequestException for invalid guest session', async () => {
      mockGuestSessionService.validate.mockResolvedValue({
        ok: false,
        reason: 'not_found',
      });

      await expect(service.findCart({ guestSessionId: 'missing' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when neither userId nor guestSessionId provided', async () => {
      await expect(service.findCart({})).rejects.toThrow(BadRequestException);
    });
  });

  describe('addItem - user', () => {
    const mockVariant = {
      id: 'variant-1',
      isActive: true,
      deletedAt: null,
      product: {
        id: 'product-1',
        name: 'Test Product',
        isActive: true,
        basePrice: 1000,
        salePrice: null,
      },
      size: 'M',
      color: 'Red',
      sku: 'SKU-001',
      salePrice: null,
      inventorySummaries: [
        { quantityAvailable: 10, storeId: 'store-1' },
        { quantityAvailable: 5, storeId: 'store-2' },
      ],
    };

    it('should add a new item to cart', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrisma.cart.upsert.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      });
      mockPrisma.cartItem.create.mockResolvedValue({ id: 'item-1' });
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [],
      });
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            variantId: 'variant-1',
            productId: 'product-1',
            quantity: 1,
            type: 'sale',
            product: {
              id: 'product-1',
              name: 'Test Product',
              slug: 'test-product',
              images: [],
              basePrice: 1000,
              salePrice: null,
            },
            variant: {
              id: 'variant-1',
              size: 'M',
              color: 'Red',
              sku: 'SKU-001',
              salePrice: null,
            },
          },
        ],
      });

      const result = await service.addItem(
        { userId: 'user-1' },
        { variantId: 'variant-1', quantity: 1, type: 'sale' },
      );

      expect(result.itemCount).toBe(1);
      expect(mockPrisma.cartItem.create).toHaveBeenCalled();
    });

    it('should update quantity for existing item', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrisma.cart.upsert.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'existing-item',
            variantId: 'variant-1',
            productId: 'product-1',
            quantity: 1,
            type: 'sale',
            product: {
              id: 'product-1',
              name: 'Test Product',
              slug: 'test-product',
              images: [],
              basePrice: 1000,
              salePrice: null,
            },
            variant: {
              id: 'variant-1',
              size: 'M',
              color: 'Red',
              sku: 'SKU-001',
              salePrice: null,
            },
          },
        ],
      });

      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'existing-item',
            variantId: 'variant-1',
            productId: 'product-1',
            quantity: 3,
            type: 'sale',
            product: {
              id: 'product-1',
              name: 'Test Product',
              slug: 'test-product',
              images: [],
              basePrice: 1000,
              salePrice: null,
            },
            variant: {
              id: 'variant-1',
              size: 'M',
              color: 'Red',
              sku: 'SKU-001',
              salePrice: null,
            },
          },
        ],
      });

      const result = await service.addItem(
        { userId: 'user-1' },
        { variantId: 'variant-1', quantity: 2, type: 'sale' },
      );

      expect(result.itemCount).toBe(3);
      expect(mockPrisma.cartItem.update).toHaveBeenCalled();
      expect(mockPrisma.cartItem.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for inactive variant', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue({
        ...mockVariant,
        isActive: false,
      });

      await expect(
        service.addItem(
          { userId: 'user-1' },
          { variantId: 'variant-1', quantity: 1, type: 'sale' },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when variant is out of stock', async () => {
      const outOfStockVariant = {
        ...mockVariant,
        inventorySummaries: [],
      };
      mockPrisma.productVariant.findUnique.mockResolvedValue(outOfStockVariant);

      await expect(
        service.addItem(
          { userId: 'user-1' },
          { variantId: 'variant-1', quantity: 1, type: 'sale' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when adding more than available stock', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'existing-item',
            variantId: 'variant-1',
            productId: 'product-1',
            quantity: 12, // Already has 12 in cart
            type: 'sale',
          },
        ],
      });

      await expect(
        service.addItem(
          { userId: 'user-1' },
          { variantId: 'variant-1', quantity: 5, type: 'sale' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addItem - guest', () => {
    const mockVariant = {
      id: 'variant-1',
      isActive: true,
      deletedAt: null,
      product: {
        id: 'product-1',
        name: 'Test Product',
        isActive: true,
        basePrice: 1000,
        salePrice: null,
      },
      size: 'M',
      color: 'Red',
      sku: 'SKU-001',
      salePrice: null,
      inventorySummaries: [
        { quantityAvailable: 10, storeId: 'store-1' },
        { quantityAvailable: 5, storeId: 'store-2' },
      ],
    };

    it('should create a new guest cart item', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrisma.guestCartItem.findUnique.mockResolvedValue(null);
      mockPrisma.guestCartItem.create.mockResolvedValue({ id: 'gci-1' });
      mockPrisma.guestCartItem.findMany.mockResolvedValue([
        {
          id: 'gci-1',
          guestSessionId: 'guest-1',
          productId: 'product-1',
          variantId: 'variant-1',
          quantity: 1,
          type: 'sale',
          product: {
            id: 'product-1',
            name: 'Test Product',
            slug: 'test-product',
            images: [],
            basePrice: 1000,
            salePrice: null,
          },
          variant: {
            id: 'variant-1',
            size: 'M',
            color: 'Red',
            sku: 'SKU-001',
            salePrice: null,
          },
        },
      ]);

      const result = await service.addItem(
        { guestSessionId: 'guest-1' },
        { variantId: 'variant-1', quantity: 1, type: 'sale' },
      );

      expect(result.itemCount).toBe(1);
      expect(mockPrisma.guestCartItem.create).toHaveBeenCalled();
    });

    it('should update quantity for existing guest cart item', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrisma.guestCartItem.findUnique.mockResolvedValue({
        id: 'gci-1',
        quantity: 1,
      });
      mockPrisma.guestCartItem.update.mockResolvedValue({});
      mockPrisma.guestCartItem.findMany.mockResolvedValue([
        {
          id: 'gci-1',
          guestSessionId: 'guest-1',
          productId: 'product-1',
          variantId: 'variant-1',
          quantity: 3,
          type: 'sale',
          product: {
            id: 'product-1',
            name: 'Test Product',
            slug: 'test-product',
            images: [],
            basePrice: 1000,
            salePrice: null,
          },
          variant: {
            id: 'variant-1',
            size: 'M',
            color: 'Red',
            sku: 'SKU-001',
            salePrice: null,
          },
        },
      ]);

      const result = await service.addItem(
        { guestSessionId: 'guest-1' },
        { variantId: 'variant-1', quantity: 2, type: 'sale' },
      );

      expect(result.itemCount).toBe(3);
      expect(mockPrisma.guestCartItem.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when variant is out of stock', async () => {
      const outOfStockVariant = {
        ...mockVariant,
        inventorySummaries: [],
      };
      mockPrisma.productVariant.findUnique.mockResolvedValue(outOfStockVariant);

      await expect(
        service.addItem(
          { guestSessionId: 'guest-1' },
          { variantId: 'variant-1', quantity: 1, type: 'sale' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when adding more than available stock', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrisma.guestCartItem.findUnique.mockResolvedValue({
        id: 'gci-1',
        quantity: 13, // Already has 13 in cart
      });

      await expect(
        service.addItem(
          { guestSessionId: 'guest-1' },
          { variantId: 'variant-1', quantity: 5, type: 'sale' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem - guest', () => {
    it('should remove the item when owned by the guest session', async () => {
      mockPrisma.guestCartItem.findFirst.mockResolvedValue({
        id: 'gci-1',
        guestSessionId: 'guest-1',
      });
      mockPrisma.guestCartItem.delete.mockResolvedValue({});

      const result = await service.removeItem('gci-1', { guestSessionId: 'guest-1' });

      expect(result).toEqual({ message: 'Item removed' });
      expect(mockPrisma.guestCartItem.delete).toHaveBeenCalledWith({
        where: { id: 'gci-1' },
      });
    });

    it('should throw NotFoundException when item not owned by the guest session', async () => {
      mockPrisma.guestCartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem('gci-1', { guestSessionId: 'guest-1' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('mergeGuestSessionIntoUserCart', () => {
    it('should move guest cart items to user cart and delete the session', async () => {
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
                {
                  productId: 'p2',
                  variantId: 'v2',
                  quantity: 1,
                  type: 'sale',
                  rentStart: null,
                  rentEnd: null,
                },
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
        });
      });

      const result = await service.mergeGuestSessionIntoUserCart('guest-1', 'user-1');

      expect(result.cartItems).toBe(2);
    });

    it('should return 0 cartItems when session is missing', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          guestSession: {
            findUnique: jest.fn().mockResolvedValue(null),
            delete: jest.fn(),
          },
          cart: { findUnique: jest.fn(), create: jest.fn() },
          cartItem: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
        });
      });

      const result = await service.mergeGuestSessionIntoUserCart('missing', 'user-1');

      expect(result.cartItems).toBe(0);
    });

    it('should merge quantities when user already has the same variant', async () => {
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
        });
      });

      const result = await service.mergeGuestSessionIntoUserCart('guest-1', 'user-1');

      expect(result.cartItems).toBe(1);
    });
  });

  describe('mergeGuestCartIntoUserCart (legacy)', () => {
    it('should merge guest items into user cart and clean up guest cart', async () => {
      const guestCart = {
        id: 'guest-cart',
        userId: 'guest-1',
        items: [
          {
            id: 'gi-1',
            cartId: 'guest-cart',
            variantId: 'v1',
            productId: 'p1',
            quantity: 2,
            type: 'sale',
          },
          {
            id: 'gi-2',
            cartId: 'guest-cart',
            variantId: 'v2',
            productId: 'p2',
            quantity: 1,
            type: 'sale',
          },
        ],
      };

      const userCart = {
        id: 'user-cart',
        userId: 'user-1',
        items: [
          {
            id: 'ui-1',
            cartId: 'user-cart',
            variantId: 'v1',
            productId: 'p1',
            quantity: 1,
            type: 'sale',
          },
        ],
      };

      const tx = {
        cart: {
          findUnique: jest.fn().mockResolvedValueOnce(userCart).mockResolvedValueOnce(guestCart),
          create: jest.fn(),
          delete: jest.fn(),
        },
        cartItem: {
          update: jest.fn(),
          create: jest.fn(),
          deleteMany: jest.fn(),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await service.mergeGuestCartIntoUserCart('guest-1', 'user-1', tx);

      expect(result.merged).toBe(true);
      expect(result.mergedItems).toBe(2);
    });

    it('should return merged=true with 0 items if guest cart is empty', async () => {
      const userCart = { id: 'user-cart', userId: 'user-1', items: [] };
      const guestCart = { id: 'guest-cart', userId: 'guest-1', items: [] };

      mockPrisma.cart.findUnique.mockResolvedValueOnce(userCart).mockResolvedValueOnce(guestCart);

      const result = await service.mergeGuestCartIntoUserCart(
        'guest-1',
        'user-1',
        mockPrisma as unknown as Prisma.TransactionClient,
      );

      expect(result.merged).toBe(true);
      expect(result.mergedItems).toBe(0);
    });
  });
});
