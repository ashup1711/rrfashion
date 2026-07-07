import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestSessionService } from '../guest/guest-session.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

export type CartIdentifier = { userId?: string; guestSessionId?: string };

export type CartContext =
  { type: 'user'; userId: string } | { type: 'guest'; guestSessionId: string };

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

  async findCart(identifier: CartIdentifier) {
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

    if (items.length === 0) {
      return {
        id: ctx.guestSessionId,
        items: [],
        itemCount: 0,
        total: 0,
      };
    }

    return this.formatGuestCart(ctx.guestSessionId, items as unknown as GuestCartItemWithDetails[]);
  }

  async addItem(identifier: CartIdentifier, dto: AddCartItemDto) {
    const ctx = await this.resolveCartContext(identifier);

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: { select: { id: true, name: true, isActive: true } } },
    });

    if (!variant || !variant.isActive || variant.deletedAt) {
      throw new NotFoundException('Variant not found');
    }

    if (!variant.product.isActive) {
      throw new BadRequestException('Product is not active');
    }

    const productId = variant.product.id;

    if (ctx.type === 'user') {
      const cart = await this.prisma.cart.upsert({
        where: { userId: ctx.userId },
        create: { userId: ctx.userId },
        update: {},
        include: this.cartInclude() as Prisma.CartInclude,
      });

      const cartWithItems = cart as unknown as CartWithItems;

      const existingItem = cartWithItems.items.find(
        (item) => item.variantId === dto.variantId && item.type === dto.type,
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
            type: dto.type,
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
          type: dto.type,
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
          type: dto.type,
        },
      });
    }

    return this.findCart({ guestSessionId: ctx.guestSessionId });
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
