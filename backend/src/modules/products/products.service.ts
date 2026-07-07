import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OnSaleQueryDto } from './dto/on-sale-query.dto';
import { SetSaleDto } from './dto/set-sale.dto';
import { slugify } from '../../common/utils/slugify';

export interface ProductFilters {
  page?: number;
  limit?: number;
  categoryId?: string;
  brandId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async findAll(filters: ProductFilters) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
    };

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.brandId) {
      where.brandId = filters.brandId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.salePrice = {};
      if (filters.minPrice !== undefined) {
        where.salePrice.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.salePrice.lte = filters.maxPrice;
      }
    }

    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }

    // Build orderBy
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sortBy) {
      const validSortFields = ['name', 'basePrice', 'salePrice', 'createdAt', 'sortPriority'];
      if (validSortFields.includes(filters.sortBy)) {
        orderBy = {
          [filters.sortBy]: filters.sortOrder || 'asc',
        };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          brand: {
            select: { id: true, name: true },
          },
          variants: {
            where: { deletedAt: null, isActive: true },
            select: {
              id: true,
              size: true,
              color: true,
              sku: true,
              salePrice: true,
              rentPricePerDay: true,
              isActive: true,
              images: {
                orderBy: { sortOrder: 'asc' },
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        brand: {
          select: { id: true, name: true, description: true },
        },
        variants: {
          where: { deletedAt: null },
          include: {
            images: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: [{ color: 'asc' }, { size: 'asc' }],
        },
        tags: true,
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    let slug = dto.slug;
    if (!slug) {
      slug = slugify(dto.name);
      let counter = 1;
      const baseSlug = slug;
      while (await this.prisma.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const data: Prisma.ProductCreateInput = {
      name: dto.name,
      slug,
      description: dto.description ?? null,
      basePrice: dto.basePrice,
      salePrice: dto.salePrice ?? null,
      images: dto.images ?? [],
      stock: dto.stock ?? 0,
      isFeatured: dto.isFeatured ?? false,
      isActive: true,
      fabric: dto.fabric ?? null,
      hsnCode: dto.hsnCode ?? null,
      isRentable: dto.isRentable ?? false,
      isSellable: dto.isSellable ?? true,
      careInstructions: dto.careInstructions ?? null,
      sortPriority: dto.sortPriority ?? 0,
      category: {
        connect: { id: dto.categoryId },
      },
    };

    if (dto.brandId) {
      data.brand = {
        connect: { id: dto.brandId },
      };
    }

    return this.prisma.product.create({
      data,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        brand: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.basePrice !== undefined) data.basePrice = dto.basePrice;
    if (dto.salePrice !== undefined) data.salePrice = dto.salePrice;
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.fabric !== undefined) data.fabric = dto.fabric;
    if (dto.hsnCode !== undefined) data.hsnCode = dto.hsnCode;
    if (dto.isRentable !== undefined) data.isRentable = dto.isRentable;
    if (dto.isSellable !== undefined) data.isSellable = dto.isSellable;
    if (dto.careInstructions !== undefined) data.careInstructions = dto.careInstructions;
    if (dto.sortPriority !== undefined) data.sortPriority = dto.sortPriority;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.categoryId) {
      data.category = { connect: { id: dto.categoryId } };
    }

    if (dto.brandId !== undefined) {
      data.brand = dto.brandId ? { connect: { id: dto.brandId } } : { disconnect: true };
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        brand: {
          select: { id: true, name: true },
        },
        variants: {
          where: { deletedAt: null },
          select: {
            id: true,
            size: true,
            color: true,
            sku: true,
            salePrice: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findOnSale(query: OnSaleQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      salePrice: { not: null },
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.brandId) {
      where.brandId = query.brandId;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.salePrice = {};
      if (query.minPrice !== undefined) {
        where.salePrice.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.salePrice.lte = query.maxPrice;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: { id: true, name: true },
          },
          variants: {
            where: { deletedAt: null, isActive: true },
            select: {
              id: true,
              size: true,
              color: true,
              salePrice: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const formatted = items.map((product) => {
      const bp = Number(product.basePrice);
      const sp = product.salePrice ? Number(product.salePrice) : null;
      const discountPercent = sp && bp > 0 ? Math.round(((bp - sp) / bp) * 100) : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        images: product.images,
        basePrice: bp,
        salePrice: sp,
        discountPercent,
        category: product.category,
        variants: product.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          salePrice: v.salePrice ? Number(v.salePrice) : null,
        })),
      };
    });

    return {
      items: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async setSalePrice(productId: string, dto: SetSaleDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { salePrice: dto.salePrice },
    });

    let notificationsQueued = 0;

    if (dto.notifyWishlistUsers) {
      const wishlistEntries = await this.prisma.wishlist.findMany({
        where: {
          variant: { productId },
          notifyOnPriceDrop: true,
        },
        select: { userId: true },
      });

      if (wishlistEntries.length > 0) {
        const notificationData = wishlistEntries.map((entry) => ({
          userId: entry.userId,
          type: 'sale_alert' as const,
          channel: 'IN_APP' as const,
          title: 'Sale Alert!',
          body: `Product is now on sale at ₹${dto.salePrice}`,
          status: 'PENDING' as const,
        }));

        await this.prisma.notification.createMany({
          data: notificationData,
        });
        notificationsQueued = notificationData.length;

        // Emit real-time socket events
        for (const entry of wishlistEntries) {
          this.notificationsGateway.sendSaleAlert(entry.userId, {
            title: 'Sale Alert!',
            body: `Product is now on sale at ₹${dto.salePrice}`,
            type: 'sale_alert',
          });
        }
        this.logger.log(`Emitted sale alert via WebSocket for ${wishlistEntries.length} users`);
      }
    }

    return {
      id: productId,
      salePrice: dto.salePrice,
      notificationsQueued,
    };
  }

  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Soft delete
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
