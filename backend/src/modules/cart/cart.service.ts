import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  GoneException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestSessionService } from '../guest/guest-session.service';
import { AddCartItemDto, CartItemType } from './dto/add-cart-item.dto';

export type CartIdentifier = { userId?: string; guestSessionId?: string };

export type CartContext =
  { type: 'user'; userId: string } | { type: 'guest'; guestSessionId: string };

export interface CartRecoveryItem {
  id: string;
  variantId: string | null;
  productId: string;
  quantity: number;
  type: string;
  unitPrice: number;
}

export interface CartRecoveryResult {
  cart: {
    id: string;
    userId: string | null;
    guestSessionId: string | null;
    abandonedAt: Date | null;
    recoveredAt: Date;
  };
  items: CartRecoveryItem[];
  recoveredAt: Date;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guestSessionService: GuestSessionService,
  ) {}

  private cartInclude() {
    return {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
              basePrice: true,
              salePrice: true,
            },
          },
          variant: {
            select: {
              id: true,
              size: true,
              color: true,
              sku: true,
              salePrice: true,
            },
          },
        },
      },
    } as const;
  }

  private guestCartInclude() {
    return {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: true,
          basePrice: true,
          salePrice: true,
        },
      },
      variant: {
        select: {
          id: true,
          size: true,
          color: true,
          sku: true,
          salePrice: true,
        },
      },
    } as const;
  }

  private async resolveCartContext({
    userId,
    guestSessionId,
  }: CartIdentifier): Promise<CartContext> {
    // REQ-SEC-004 / SEC-06: identifier.guestSessionId is ALWAYS derived from the
    // verified guest JWT (StoreAuthGuard / toCartIdentifier) — never from a
    // client-supplied id. Every guestCartItem read/write below is scoped by this
    // token-derived session id, closing the IDOR window.
    if (userId) return { type: 'user', userId };
    if (guestSessionId) {
      const validation = await this.guestSessionService.validate(guestSessionId);
      if (!validation.ok) {
        throw new BadRequestException(`Invalid or expired guest session: ${validation.reason}`);
      }
      await this.guestSessionService.touch(guestSessionId);
      return { type: 'guest', guestSessionId };
    }
    throw new BadRequestException('Either userId or guestSessionId is required');
  }

  /**
   * REQ-BE-003 / SEC-06: a client-supplied `cartId` is only ever a hint — it is
   * re-scoped to the token-derived identity and rejected (409) when it points
   * at a cart owned by someone else. Never trust the id for authorization.
   */
  private async assertCartOwnership(cartId: string, ctx: CartContext): Promise<void> {
    const owned = await this.prisma.cart.findFirst({
      where:
        ctx.type === 'user'
          ? { id: cartId, userId: ctx.userId }
          : { id: cartId, guestSessionId: ctx.guestSessionId },
      select: { id: true },
    });

    if (!owned) {
      throw new ConflictException('Cart does not belong to the current user');
    }
  }

  /**
   * REQ-BE-005: resolve the caller's own Cart id (creating the tracking row for
   * guests when a cart exists) so a recovery token can be minted. 404 when the
   * cart has not been created yet.
   */
  async resolveOwnCartId(identifier: CartIdentifier): Promise<string> {
    const ctx = await this.resolveCartContext(identifier);

    const cart = await this.prisma.cart.findUnique({
      where: ctx.type === 'user' ? { userId: ctx.userId } : { guestSessionId: ctx.guestSessionId },
      select: { id: true },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found — add items first');
    }

    return cart.id;
  }

  async findCart(identifier: CartIdentifier) {
    // REQ-BE-GUEST-001: anonymous browse (AllowGuest=true, no token) returns an
    // empty cart instead of throwing — identity is never client-supplied.
    if (!identifier.userId && !identifier.guestSessionId) {
      return { id: 'anonymous', items: [], itemCount: 0, total: 0 };
    }

    const ctx = await this.resolveCartContext(identifier);
    if (ctx.type === 'user') {
      let cart = await this.prisma.cart.findUnique({
        where: { userId: ctx.userId },
        include: this.cartInclude() as Prisma.CartInclude,
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { userId: ctx.userId },
          include: this.cartInclude() as Prisma.CartInclude,
        });
      }

      return this.formatCart(cart as unknown as CartWithItems);
    }

    const items = await this.prisma.guestCartItem.findMany({
      where: { guestSessionId: ctx.guestSessionId },
      include: this.guestCartInclude() as Prisma.GuestCartItemInclude,
    });

    // REQ-BE-003: prefer the tracking Cart{guestSessionId} id when a row exists
    // so the FE can pin a stable cartId (e.g. from a recovery link).
    const trackingCart = await this.prisma.cart.findUnique({
      where: { guestSessionId: ctx.guestSessionId },
      select: { id: true },
    });

    if (items.length === 0) {
      return {
        id: trackingCart?.id ?? ctx.guestSessionId,
        items: [],
        itemCount: 0,
        total: 0,
      };
    }

    return this.formatGuestCart(
      trackingCart?.id ?? ctx.guestSessionId,
      items as unknown as GuestCartItemWithDetails[],
    );
  }

  async addItem(identifier: CartIdentifier, dto: AddCartItemDto) {
    const ctx = await this.resolveCartContext(identifier);
    // REQ-BE-003: type is optional on the wire; default to a sale item.
    const type = dto.type ?? CartItemType.SALE;
    const rentStart = dto.rentStart ? new Date(dto.rentStart) : null;
    const rentEnd = dto.rentEnd ? new Date(dto.rentEnd) : null;

    if (dto.cartId) {
      await this.assertCartOwnership(dto.cartId, ctx);
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: {
        product: { select: { id: true, name: true, isActive: true } },
        inventorySummaries: {
          where: { quantityAvailable: { gt: 0 } },
          select: { quantityAvailable: true, storeId: true },
        },
      },
    });

    if (!variant || !variant.isActive || variant.deletedAt) {
      throw new NotFoundException('Variant not found');
    }

    if (!variant.product.isActive) {
      throw new BadRequestException('Product is not active');
    }

    // Check stock availability
    const totalAvailableStock = variant.inventorySummaries.reduce(
      (sum, summary) => sum + summary.quantityAvailable,
      0,
    );

    if (totalAvailableStock <= 0) {
      throw new BadRequestException(
        `Variant "${variant.size}" - "${variant.color}" is out of stock`,
      );
    }

    const productId = variant.product.id;

    // Check if adding this quantity would exceed available stock
    const existingQuantity = await this.getExistingCartQuantity(ctx, dto.variantId, type);
    const newTotalQuantity = existingQuantity + dto.quantity;

    if (newTotalQuantity > totalAvailableStock) {
      throw new BadRequestException(
        `Cannot add ${dto.quantity} items. Only ${totalAvailableStock - existingQuantity} more available for variant "${variant.size}" - "${variant.color}"`,
      );
    }

    if (ctx.type === 'user') {
      const cart = await this.prisma.cart.upsert({
        where: { userId: ctx.userId },
        create: { userId: ctx.userId },
        update: {},
        include: this.cartInclude() as Prisma.CartInclude,
      });

      const cartWithItems = cart as unknown as CartWithItems;

      const existingItem = cartWithItems.items.find(
        (item) => item.variantId === dto.variantId && item.type === type,
      );

      if (existingItem) {
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + dto.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: cartWithItems.id,
            productId,
            variantId: dto.variantId,
            quantity: dto.quantity,
            type,
            rentStart,
            rentEnd,
          },
        });
      }

      return this.findCart({ userId: ctx.userId });
    }

    const existing = await this.prisma.guestCartItem.findUnique({
      where: {
        guestSessionId_variantId_type: {
          guestSessionId: ctx.guestSessionId,
          variantId: dto.variantId,
          type,
        },
      },
    });

    if (existing) {
      await this.prisma.guestCartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity },
      });
    } else {
      await this.prisma.guestCartItem.create({
        data: {
          guestSessionId: ctx.guestSessionId,
          productId,
          variantId: dto.variantId,
          quantity: dto.quantity,
          type,
          rentStart,
          rentEnd,
        },
      });
    }

    // REQ-BE-003: guest carts lazily materialize a Cart{guestSessionId}
    // tracking row on the first add (upsert also bumps updatedAt for the
    // abandonment scan).
    await this.prisma.cart.upsert({
      where: { guestSessionId: ctx.guestSessionId },
      create: { guestSessionId: ctx.guestSessionId },
      update: {},
    });

    return this.findCart({ guestSessionId: ctx.guestSessionId });
  }

  /**
   * Get the current quantity of a variant in the cart
   */
  private async getExistingCartQuantity(
    ctx: CartContext,
    variantId: string,
    type: string,
  ): Promise<number> {
    if (ctx.type === 'user') {
      const cart = await this.prisma.cart.findUnique({
        where: { userId: ctx.userId },
        include: {
          items: {
            where: { variantId, type },
            select: { quantity: true },
          },
        },
      });
      return cart?.items[0]?.quantity || 0;
    } else {
      const item = await this.prisma.guestCartItem.findUnique({
        where: {
          guestSessionId_variantId_type: {
            guestSessionId: ctx.guestSessionId,
            variantId,
            type,
          },
        },
        select: { quantity: true },
      });
      return item?.quantity || 0;
    }
  }

  async updateItem(itemId: string, identifier: CartIdentifier, quantity: number) {
    const ctx = await this.resolveCartContext(identifier);

    if (ctx.type === 'user') {
      const item = await this.prisma.cartItem.findFirst({
        where: {
          id: itemId,
          cart: { userId: ctx.userId },
        },
      });

      if (!item) {
        throw new NotFoundException('Cart item not found');
      }

      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });

      return this.findCart({ userId: ctx.userId });
    }

    const item = await this.prisma.guestCartItem.findFirst({
      where: {
        id: itemId,
        guestSessionId: ctx.guestSessionId,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.guestCartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.findCart({ guestSessionId: ctx.guestSessionId });
  }

  async removeItem(itemId: string, identifier: CartIdentifier) {
    const ctx = await this.resolveCartContext(identifier);

    if (ctx.type === 'user') {
      const item = await this.prisma.cartItem.findFirst({
        where: {
          id: itemId,
          cart: { userId: ctx.userId },
        },
      });

      if (!item) {
        throw new NotFoundException('Cart item not found');
      }

      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return { message: 'Item removed' };
    }

    const item = await this.prisma.guestCartItem.findFirst({
      where: {
        id: itemId,
        guestSessionId: ctx.guestSessionId,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.guestCartItem.delete({ where: { id: itemId } });
    return { message: 'Item removed' };
  }

  /**
   * Merge a guest session's cart items into the user's cart.
   * Called after login/register when a guestSessionId is provided.
   */
  async mergeGuestSessionIntoUserCart(
    guestSessionId: string,
    userId: string,
  ): Promise<{ cartItems: number }> {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.guestSession.findUnique({
        where: { id: guestSessionId },
        include: { cartItems: true },
      });

      if (!session) {
        return { cartItems: 0 };
      }

      let userCart = await tx.cart.findUnique({ where: { userId } });
      if (!userCart) {
        userCart = await tx.cart.create({ data: { userId } });
      }

      let cartItemsMigrated = 0;
      for (const item of session.cartItems) {
        const existing = await tx.cartItem.findFirst({
          where: {
            cartId: userCart.id,
            variantId: item.variantId,
            type: item.type,
          },
        });
        if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + item.quantity },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: userCart.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              type: item.type,
              rentStart: item.rentStart,
              rentEnd: item.rentEnd,
            },
          });
        }
        cartItemsMigrated++;
      }

      await tx.guestSession.delete({ where: { id: guestSessionId } });

      // REQ-BE-003: drop the tracking Cart{guestSessionId} row — its items were
      // migrated into the user cart above and the session is now deleted.
      await tx.cart.deleteMany({ where: { guestSessionId } });

      this.logger.log({
        guestSessionId,
        userId,
        cartItems: cartItemsMigrated,
        action: 'cart.guest.session.merged',
      });

      return { cartItems: cartItemsMigrated };
    });
  }

  /**
   * @deprecated Use mergeGuestSessionIntoUserCart instead.
   * Kept for backward compatibility with the old User-based guest flow
   * (one release).
   */
  async mergeGuestCartIntoUserCart(
    guestId: string,
    userId: string,
    txClient?: Prisma.TransactionClient,
  ): Promise<{ merged: boolean; mergedItems: number }> {
    const db = txClient || this.prisma;

    let userCart = await db.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!userCart) {
      userCart = await db.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    const guestCart = await db.cart.findUnique({
      where: { userId: guestId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return { merged: true, mergedItems: 0 };
    }

    let mergedCount = 0;

    for (const item of guestCart.items) {
      const existingItem = userCart.items.find(
        (ui) => ui.variantId === item.variantId && ui.type === item.type,
      );

      if (existingItem) {
        await db.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + item.quantity },
        });
      } else {
        await db.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            type: item.type,
          },
        });
      }
      mergedCount++;
    }

    await db.cartItem.deleteMany({
      where: { cartId: guestCart.id },
    });

    await db.cart.delete({
      where: { id: guestCart.id },
    });

    return { merged: true, mergedItems: mergedCount };
  }

  async mergeCart(guestSessionId: string, userId: string) {
    return this.mergeGuestSessionIntoUserCart(guestSessionId, userId);
  }

  /**
   * @deprecated Kept for one release so the old /auth/merge-guest-account
   * flow (which uses the legacy User-based guestId) still works.
   */
  async mergeCartByGuestId(guestId: string, userId: string) {
    const guestUser = await this.prisma.user.findUnique({
      where: { id: guestId },
    });

    if (!guestUser || !guestUser.isGuest) {
      throw new NotFoundException('Guest user not found');
    }

    return this.prisma.$transaction(async (tx) => {
      return this.mergeGuestCartIntoUserCart(guestId, userId, tx);
    });
  }

  /**
   * REQ-BE-005: recover an abandoned cart pointed at by a signed recovery
   * token (already resolved to a cartId by the controller). Marks the cart
   * recovered, re-attaches a guest-owned cart to the authenticated customer,
   * and returns the cart contents.
   *
   * 410 Gone when the link has already been used (idempotent one-shot link).
   */
  async recoverCart(cartId: string, identifier: CartIdentifier): Promise<CartRecoveryResult> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: {
        id: true,
        userId: true,
        guestSessionId: true,
        abandonedAt: true,
        recoveredAt: true,
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.recoveredAt) {
      throw new GoneException('Cart recovery link has already been used');
    }

    this.assertRecoveryOwnership(cart, identifier);

    // Guest-owned cart + authenticated customer → migrate GuestCartItem rows
    // into the customer's Cart and re-attach.
    if (identifier.userId && cart.userId === null && cart.guestSessionId) {
      return this.attachGuestCartToUser(cart.id, cart.guestSessionId, identifier.userId);
    }

    // Otherwise (user's own cart, same guest session, or anonymous viewer)
    // just mark it recovered and return the contents.
    const recoveredAt = new Date();
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { recoveredAt },
    });

    const items = await this.loadRecoveryItems(cart);

    return {
      cart: { ...cart, recoveredAt },
      items,
      recoveredAt,
    };
  }

  private assertRecoveryOwnership(
    cart: { userId: string | null; guestSessionId: string | null },
    identifier: CartIdentifier,
  ): void {
    // SEC-06: never let one customer claim (or even observe) another user's
    // cart through a recovery link.
    if (cart.userId && cart.userId !== (identifier.userId ?? null)) {
      throw new NotFoundException('Cart not found');
    }
    if (
      identifier.guestSessionId &&
      cart.guestSessionId &&
      cart.guestSessionId !== identifier.guestSessionId
    ) {
      throw new NotFoundException('Cart not found');
    }
  }

  private async attachGuestCartToUser(
    cartId: string,
    guestSessionId: string,
    userId: string,
  ): Promise<CartRecoveryResult> {
    const recoveredAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const existingUserCart = await tx.cart.findUnique({
        where: { userId },
        select: { id: true },
      });

      const guestItems = await tx.guestCartItem.findMany({
        where: { guestSessionId },
        select: {
          productId: true,
          variantId: true,
          quantity: true,
          type: true,
          rentStart: true,
          rentEnd: true,
        },
      });

      const targetCartId = existingUserCart?.id ?? cartId;

      for (const item of guestItems) {
        await this.upsertCartItemTx(tx, targetCartId, item);
      }

      await tx.guestCartItem.deleteMany({ where: { guestSessionId } });

      if (existingUserCart) {
        // The abandoned cart row stays for 410-on-reuse audit; the items now
        // live in the user's existing cart.
        await tx.cart.update({
          where: { id: cartId },
          data: { recoveredAt },
        });
      } else {
        await tx.cart.update({
          where: { id: cartId },
          data: { userId, guestSessionId: null, recoveredAt },
        });
      }

      return this.buildUserRecovery(targetCartId, userId, recoveredAt);
    });
  }

  private async upsertCartItemTx(
    tx: Prisma.TransactionClient,
    cartId: string,
    item: {
      productId: string;
      variantId: string | null;
      quantity: number;
      type: string;
      rentStart: Date | null;
      rentEnd: Date | null;
    },
  ): Promise<void> {
    const existing = await tx.cartItem.findFirst({
      where: { cartId, variantId: item.variantId, type: item.type },
      select: { id: true, quantity: true },
    });

    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          type: item.type,
          rentStart: item.rentStart,
          rentEnd: item.rentEnd,
        },
      });
    }
  }

  private async buildUserRecovery(
    cartId: string,
    userId: string,
    recoveredAt: Date,
  ): Promise<CartRecoveryResult> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: {
        id: true,
        userId: true,
        guestSessionId: true,
        abandonedAt: true,
        recoveredAt: true,
      },
    });

    const items = cart ? await this.loadRecoveryItems(cart) : [];

    return {
      cart: {
        id: cartId,
        userId,
        guestSessionId: null,
        abandonedAt: cart?.abandonedAt ?? null,
        recoveredAt,
      },
      items,
      recoveredAt,
    };
  }

  private async loadRecoveryItems(cart: {
    id: string;
    userId: string | null;
    guestSessionId: string | null;
  }): Promise<CartRecoveryItem[]> {
    if (cart.userId) {
      const full = await this.prisma.cart.findUnique({
        where: { id: cart.id },
        include: this.cartInclude() as Prisma.CartInclude,
      });
      if (!full) return [];
      return (full as unknown as CartWithItems).items.map((item) => this.toRecoveryItem(item));
    }

    if (cart.guestSessionId) {
      const items = await this.prisma.guestCartItem.findMany({
        where: { guestSessionId: cart.guestSessionId },
        include: this.guestCartInclude() as Prisma.GuestCartItemInclude,
      });
      return (items as unknown as GuestCartItemWithDetails[]).map((item) =>
        this.toRecoveryItem(item),
      );
    }

    return [];
  }

  private toRecoveryItem(item: CartItemWithDetails | GuestCartItemWithDetails): CartRecoveryItem {
    const unitPrice = item.variant?.salePrice
      ? Number(item.variant.salePrice)
      : item.product.salePrice
        ? Number(item.product.salePrice)
        : Number(item.product.basePrice);

    return {
      id: item.id,
      variantId: item.variantId,
      productId: item.productId,
      quantity: item.quantity,
      type: item.type,
      unitPrice,
    };
  }

  private formatCart(cart: CartWithItems) {
    const items = cart.items.map((item) => {
      const unitPrice = item.variant?.salePrice
        ? Number(item.variant.salePrice)
        : item.product.salePrice
          ? Number(item.product.salePrice)
          : Number(item.product.basePrice);

      return {
        id: item.id,
        variantId: item.variantId,
        productId: item.productId,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          images: item.product.images,
          basePrice: Number(item.product.basePrice),
          salePrice: item.product.salePrice ? Number(item.product.salePrice) : null,
        },
        variant: item.variant
          ? {
              id: item.variant.id,
              size: item.variant.size,
              color: item.variant.color,
              sku: item.variant.sku,
              salePrice: item.variant.salePrice ? Number(item.variant.salePrice) : null,
            }
          : null,
        quantity: item.quantity,
        type: item.type,
        unitPrice,
      };
    });

    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      id: cart.id,
      items,
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      total,
    };
  }

  private formatGuestCart(guestSessionId: string, items: GuestCartItemWithDetails[]) {
    const formatted = items.map((item) => {
      const unitPrice = item.variant?.salePrice
        ? Number(item.variant.salePrice)
        : item.product.salePrice
          ? Number(item.product.salePrice)
          : Number(item.product.basePrice);

      return {
        id: item.id,
        variantId: item.variantId,
        productId: item.productId,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          images: item.product.images,
          basePrice: Number(item.product.basePrice),
          salePrice: item.product.salePrice ? Number(item.product.salePrice) : null,
        },
        variant: item.variant
          ? {
              id: item.variant.id,
              size: item.variant.size,
              color: item.variant.color,
              sku: item.variant.sku,
              salePrice: item.variant.salePrice ? Number(item.variant.salePrice) : null,
            }
          : null,
        quantity: item.quantity,
        type: item.type,
        unitPrice,
      };
    });

    const total = formatted.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      id: guestSessionId,
      items: formatted,
      itemCount: formatted.reduce((count, item) => count + item.quantity, 0),
      total,
    };
  }
}

interface CartItemWithDetails {
  id: string;
  variantId: string | null;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    basePrice: Prisma.Decimal;
    salePrice: Prisma.Decimal | null;
  };
  variant: {
    id: string;
    size: string;
    color: string;
    sku: string;
    salePrice: Prisma.Decimal | null;
  } | null;
  quantity: number;
  type: string;
}

interface CartWithItems {
  id: string;
  userId: string;
  items: CartItemWithDetails[];
}

interface GuestCartItemWithDetails {
  id: string;
  variantId: string | null;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    basePrice: Prisma.Decimal;
    salePrice: Prisma.Decimal | null;
  };
  variant: {
    id: string;
    size: string;
    color: string;
    sku: string;
    salePrice: Prisma.Decimal | null;
  } | null;
  quantity: number;
  type: string;
}
