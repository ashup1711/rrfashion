import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, GoneException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CartService } from './cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestSessionService } from '../guest/guest-session.service';
import { CartItemType } from './dto/add-cart-item.dto';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;
  let guestSessionService: GuestSessionService;

  const mockPrisma = {
    cart: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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
      deleteMany: jest.fn(),
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
          type: CartItemType.SALE,
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

    // REQ-BE-GUEST-001: anonymous browse (AllowGuest(true), no token) returns an
    // empty cart instead of throwing — identity is never client-supplied.
    it('should return an empty cart for anonymous browse (no identifier)', async () => {
      const result = await service.findCart({});

      expect(result.items).toEqual([]);
      expect(result.itemCount).toBe(0);
      expect(result.total).toBe(0);
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
            type: CartItemType.SALE,
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
        { variantId: 'variant-1', quantity: 1, type: CartItemType.SALE },
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
            type: CartItemType.SALE,
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
            type: CartItemType.SALE,
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
        { variantId: 'variant-1', quantity: 2, type: CartItemType.SALE },
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
          { variantId: 'variant-1', quantity: 1, type: CartItemType.SALE },
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
          { variantId: 'variant-1', quantity: 1, type: CartItemType.SALE },
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
            type: CartItemType.SALE,
          },
        ],
      });

      await expect(
        service.addItem(
          { userId: 'user-1' },
          { variantId: 'variant-1', quantity: 5, type: CartItemType.SALE },
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
          type: CartItemType.SALE,
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
        { variantId: 'variant-1', quantity: 1, type: CartItemType.SALE },
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
          type: CartItemType.SALE,
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
        { variantId: 'variant-1', quantity: 2, type: CartItemType.SALE },
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
          { variantId: 'variant-1', quantity: 1, type: CartItemType.SALE },
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
          { variantId: 'variant-1', quantity: 5, type: CartItemType.SALE },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateItem - guest (REQ-SEC-004 IDOR)', () => {
    it('scopes the lookup by the token-derived guestSessionId', async () => {
      mockPrisma.guestCartItem.findFirst.mockResolvedValue({
        id: 'gci-1',
        guestSessionId: 'guest-1',
        quantity: 2,
      });
      mockPrisma.guestCartItem.update.mockResolvedValue({});
      mockPrisma.guestCartItem.findMany.mockResolvedValue([]);

      await service.updateItem('gci-1', { guestSessionId: 'guest-1' }, 3);

      expect(mockPrisma.guestCartItem.findFirst).toHaveBeenCalledWith({
        where: { id: 'gci-1', guestSessionId: 'guest-1' },
      });
    });

    it('rejects mutations on an item owned by a different guest session (no target rows)', async () => {
      mockPrisma.guestCartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem('item-of-other-session', { guestSessionId: 'my-session' }, 2),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.guestCartItem.update).not.toHaveBeenCalled();
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
                  type: CartItemType.SALE,
                  rentStart: null,
                  rentEnd: null,
                },
                {
                  productId: 'p2',
                  variantId: 'v2',
                  quantity: 1,
                  type: CartItemType.SALE,
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
            deleteMany: jest.fn(),
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
          cart: { findUnique: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
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
                  type: CartItemType.SALE,
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
            deleteMany: jest.fn(),
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
            type: CartItemType.SALE,
          },
          {
            id: 'gi-2',
            cartId: 'guest-cart',
            variantId: 'v2',
            productId: 'p2',
            quantity: 1,
            type: CartItemType.SALE,
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
            type: CartItemType.SALE,
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

  describe('recoverCart (REQ-BE-005)', () => {
    const userCartRow = {
      id: 'cart-1',
      userId: 'user-1',
      guestSessionId: null,
      abandonedAt: new Date('2026-07-20T00:00:00.000Z'),
      recoveredAt: null,
    };

    const userCartWithItems = {
      id: 'cart-1',
      userId: 'user-1',
      items: [
        {
          id: 'item-1',
          variantId: 'v1',
          productId: 'p1',
          quantity: 1,
          type: CartItemType.SALE,
          product: {
            id: 'p1',
            name: 'Test Product',
            slug: 'test-product',
            images: [],
            basePrice: 1000,
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
      ],
    };

    it('marks an owned user cart recovered and returns its items', async () => {
      mockPrisma.cart.findUnique
        .mockResolvedValueOnce(userCartRow)
        .mockResolvedValueOnce(userCartWithItems);
      mockPrisma.cart.update.mockResolvedValue({});

      const result = await service.recoverCart('cart-1', { userId: 'user-1' });

      expect(result.cart.recoveredAt).toBeInstanceOf(Date);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].unitPrice).toBe(1000);
      expect(mockPrisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { recoveredAt: expect.any(Date) },
      });
    });

    it('throws 410 Gone when the link has already been used', async () => {
      mockPrisma.cart.findUnique.mockResolvedValueOnce({
        ...userCartRow,
        recoveredAt: new Date('2026-07-21T00:00:00.000Z'),
      });

      await expect(service.recoverCart('cart-1', { userId: 'user-1' })).rejects.toThrow(
        GoneException,
      );
      expect(mockPrisma.cart.update).not.toHaveBeenCalled();
    });

    it('throws NotFound when the cart does not exist', async () => {
      mockPrisma.cart.findUnique.mockResolvedValueOnce(null);

      await expect(service.recoverCart('missing', { userId: 'user-1' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not let a customer claim another users cart (SEC-06)', async () => {
      mockPrisma.cart.findUnique.mockResolvedValueOnce({
        ...userCartRow,
        userId: 'other-user',
      });

      await expect(service.recoverCart('cart-1', { userId: 'user-1' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('re-attaches a guest-owned cart to the customer and migrates items', async () => {
      const guestCartRow = {
        id: 'guest-cart-1',
        userId: null,
        guestSessionId: 'guest-session-1',
        abandonedAt: new Date('2026-07-20T00:00:00.000Z'),
        recoveredAt: null,
      };

      mockPrisma.cart.findUnique
        .mockResolvedValueOnce(guestCartRow) // recoverCart lookup
        .mockResolvedValueOnce({
          id: 'guest-cart-1',
          userId: 'user-1',
          guestSessionId: null,
          abandonedAt: guestCartRow.abandonedAt,
          recoveredAt: new Date('2026-07-22T00:00:00.000Z'),
        }) // buildUserRecovery lookup
        .mockResolvedValueOnce(userCartWithItems); // loadRecoveryItems lookup

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          cart: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
          },
          guestCartItem: {
            findMany: jest.fn().mockResolvedValue([
              {
                productId: 'p1',
                variantId: 'v1',
                quantity: 2,
                type: CartItemType.SALE,
                rentStart: null,
                rentEnd: null,
              },
            ]),
            deleteMany: jest.fn(),
          },
          cartItem: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
            update: jest.fn(),
          },
        });
      });

      const result = await service.recoverCart('guest-cart-1', { userId: 'user-1' });

      expect(result.cart.userId).toBe('user-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].unitPrice).toBe(1000);
      expect(mockPrisma.cart.update).not.toHaveBeenCalled(); // update happened inside tx
    });
  });

  describe('resolveOwnCartId (REQ-BE-005)', () => {
    it('returns the current users cart id', async () => {
      mockPrisma.cart.findUnique.mockResolvedValueOnce({ id: 'cart-1' });

      const cartId = await service.resolveOwnCartId({ userId: 'user-1' });

      expect(cartId).toBe('cart-1');
      expect(mockPrisma.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { id: true },
      });
    });

    it('throws NotFound when no cart exists yet', async () => {
      mockPrisma.cart.findUnique.mockResolvedValueOnce(null);

      await expect(service.resolveOwnCartId({ userId: 'user-1' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
