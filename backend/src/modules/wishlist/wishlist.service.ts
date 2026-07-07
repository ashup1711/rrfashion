import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { GuestSessionService } from '../guest/guest-session.service';
import { AddWishlistDto } from './dto/add-wishlist.dto';

export type WishlistIdentifier = { userId?: string; guestSessionId?: string };

export type WishlistContext =
  { type: 'user'; userId: string } | { type: 'guest'; guestSessionId: string };

export interface AddAllToCartResult {
  added: number;
  skipped: number;
  unavailable: Array<{ variantId: string; reason: string }>;
}

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly guestSessionService: GuestSessionService,
  ) {}

  private async resolveWishlistContext(identifier: WishlistIdentifier): Promise<WishlistContext> {
    if (identifier.userId) return { type: 'user', userId: identifier.userId };
    if (identifier.guestSessionId) {
      const validation = await this.guestSessionService.validate(identifier.guestSessionId);
      if (!validation.ok) {
        throw new BadRequestException(`Invalid or expired guest session: ${validation.reason}`);
      }
      await this.guestSessionService.touch(identifier.guestSessionId);
      return { type: 'guest', guestSessionId: identifier.guestSessionId };
    }
    throw new BadRequestException('Either userId or guestSessionId is required');
  }

  async findAll(identifier: WishlistIdentifier) {
    const ctx = await this.resolveWishlistContext(identifier);
    if (ctx.type === 'user') {
      return this.prisma.wishlist.findMany({
        where: { userId: ctx.userId },
        include: {
          variant: {
            include: {
              product: {
                select: { id: true, name: true, slug: true, images: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.guestWishlistItem.findMany({
      where: { guestSessionId: ctx.guestSessionId },
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, images: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(identifier: WishlistIdentifier, dto: AddWishlistDto) {
    const ctx = await this.resolveWishlistContext(identifier);

    if (ctx.type === 'user') {
      const existing = await this.prisma.wishlist.findUnique({
        where: {
          userId_variantId: { userId: ctx.userId, variantId: dto.variantId },
        },
      });

      if (existing) {
        return this.prisma.wishlist.update({
          where: { id: existing.id },
          data: {
            notifyOnRestock: dto.notifyOnRestock ?? existing.notifyOnRestock,
            notifyOnPriceDrop: dto.notifyOnPriceDrop ?? existing.notifyOnPriceDrop,
          },
        });
      }

      return this.prisma.wishlist.create({
        data: {
          userId: ctx.userId,
          variantId: dto.variantId,
          notifyOnRestock: dto.notifyOnRestock ?? false,
          notifyOnPriceDrop: dto.notifyOnPriceDrop ?? false,
        },
        include: {
          variant: {
            include: { product: { select: { name: true, slug: true } } },
          },
        },
      });
    }

    const existing = await this.prisma.guestWishlistItem.findUnique({
      where: {
        guestSessionId_variantId: {
          guestSessionId: ctx.guestSessionId,
          variantId: dto.variantId,
        },
      },
    });

    if (existing) {
      return this.prisma.guestWishlistItem.update({
        where: { id: existing.id },
        data: {
          notifyOnRestock: dto.notifyOnRestock ?? existing.notifyOnRestock,
          notifyOnPriceDrop: dto.notifyOnPriceDrop ?? existing.notifyOnPriceDrop,
        },
      });
    }

    return this.prisma.guestWishlistItem.create({
      data: {
        guestSessionId: ctx.guestSessionId,
        variantId: dto.variantId,
        notifyOnRestock: dto.notifyOnRestock ?? false,
        notifyOnPriceDrop: dto.notifyOnPriceDrop ?? false,
      },
      include: {
        variant: {
          include: { product: { select: { name: true, slug: true } } },
        },
      },
    });
  }

  async remove(identifier: WishlistIdentifier, variantId: string) {
    const ctx = await this.resolveWishlistContext(identifier);

    if (ctx.type === 'user') {
      const entry = await this.prisma.wishlist.findUnique({
        where: { userId_variantId: { userId: ctx.userId, variantId } },
      });

      if (!entry) throw new NotFoundException('Item not in wishlist');

      await this.prisma.wishlist.delete({ where: { id: entry.id } });
      return { message: 'Removed from wishlist' };
    }

    const entry = await this.prisma.guestWishlistItem.findUnique({
      where: {
        guestSessionId_variantId: {
          guestSessionId: ctx.guestSessionId,
          variantId,
        },
      },
    });

    if (!entry) throw new NotFoundException('Item not in wishlist');

    await this.prisma.guestWishlistItem.delete({ where: { id: entry.id } });
    return { message: 'Removed from wishlist' };
  }

  async merge(identifier: WishlistIdentifier): Promise<{ merged: number; skipped: number }> {
    if (!identifier.guestSessionId || !identifier.userId) {
      throw new BadRequestException('Both guestSessionId and userId are required');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.guestSession.findUnique({
        where: { id: identifier.guestSessionId! },
        include: { wishlistItems: true },
      });

      if (!session || session.wishlistItems.length === 0) {
        return { merged: 0, skipped: 0 };
      }

      const variantIds = session.wishlistItems.map((w) => w.variantId);
      const existing = await tx.wishlist.findMany({
        where: { userId: identifier.userId!, variantId: { in: variantIds } },
        select: { variantId: true },
      });
      const existingIds = new Set(existing.map((e) => e.variantId));

      const toCreate = session.wishlistItems.filter((w) => !existingIds.has(w.variantId));

      let mergedCount = 0;
      if (toCreate.length > 0) {
        await tx.wishlist.createMany({
          data: toCreate.map((w) => ({
            userId: identifier.userId!,
            variantId: w.variantId,
            notifyOnRestock: w.notifyOnRestock,
            notifyOnPriceDrop: w.notifyOnPriceDrop,
          })),
        });
        mergedCount = toCreate.length;
      }

      await tx.guestSession.delete({ where: { id: identifier.guestSessionId! } });

      return {
        merged: mergedCount,
        skipped: session.wishlistItems.length - mergedCount,
      };
    });

    this.logger.log({
      guestSessionId: identifier.guestSessionId,
      userId: identifier.userId,
      merged: result.merged,
      skipped: result.skipped,
      action: 'wishlist.guest.session.merged',
    });

    return result;
  }

  /**
   * @deprecated Kept for one release so old /wishlist/merge calls with
   * the legacy `guestId` (User-based) still work.
   */
  async mergeByGuestUser(guestId: string, userId: string) {
    const guestWishlistEntries = await this.prisma.wishlist.findMany({
      where: { userId: guestId },
    });

    if (guestWishlistEntries.length === 0) {
      return { merged: 0, skipped: 0 };
    }

    const guestVariantIds = guestWishlistEntries.map((e) => e.variantId);
    const existingUserEntries = await this.prisma.wishlist.findMany({
      where: { userId, variantId: { in: guestVariantIds } },
      select: { variantId: true },
    });
    const existingVariantIds = new Set(existingUserEntries.map((e) => e.variantId));

    let mergedCount = 0;
    let skippedCount = 0;

    const entriesToCreate = guestWishlistEntries.filter(
      (entry) => !existingVariantIds.has(entry.variantId),
    );

    if (entriesToCreate.length > 0) {
      await this.prisma.wishlist.createMany({
        data: entriesToCreate.map((entry) => ({
          userId,
          variantId: entry.variantId,
          notifyOnRestock: entry.notifyOnRestock,
          notifyOnPriceDrop: entry.notifyOnPriceDrop,
        })),
      });
      mergedCount = entriesToCreate.length;
    }

    skippedCount = guestWishlistEntries.length - mergedCount;

    await this.prisma.wishlist.deleteMany({
      where: { userId: guestId },
    });

    return { merged: mergedCount, skipped: skippedCount };
  }

  async addAllToCart(identifier: WishlistIdentifier): Promise<AddAllToCartResult> {
    const ctx = await this.resolveWishlistContext(identifier);

    let entries: Array<{
      variantId: string;
      variant: {
        isActive: boolean;
        deletedAt: Date | null;
        product: { id: string; name: string; isActive: boolean };
      };
    }>;

    if (ctx.type === 'user') {
      entries = await this.prisma.wishlist.findMany({
        where: { userId: ctx.userId },
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, isActive: true } },
            },
          },
        },
      });
    } else {
      entries = await this.prisma.guestWishlistItem.findMany({
        where: { guestSessionId: ctx.guestSessionId },
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, isActive: true } },
            },
          },
        },
      });
    }

    if (entries.length === 0) {
      return { added: 0, skipped: 0, unavailable: [] };
    }

    let added = 0;
    let skipped = 0;
    const unavailable: Array<{ variantId: string; reason: string }> = [];

    for (const entry of entries) {
      if (!entry.variant.isActive || entry.variant.deletedAt) {
        unavailable.push({ variantId: entry.variantId, reason: 'variant_unavailable' });
        skipped++;
        continue;
      }

      if (!entry.variant.product.isActive) {
        unavailable.push({ variantId: entry.variantId, reason: 'product_discontinued' });
        skipped++;
        continue;
      }

      try {
        await this.cartService.addItem(identifier, {
          variantId: entry.variantId,
          quantity: 1,
          type: 'sale',
        });
        added++;
      } catch {
        unavailable.push({ variantId: entry.variantId, reason: 'failed_to_add' });
        skipped++;
      }
    }

    return { added, skipped, unavailable };
  }
}
