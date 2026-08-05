import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OnSaleQueryDto } from './dto/on-sale-query.dto';
import { SetSaleDto } from './dto/set-sale.dto';
import { BulkUpdateDto, BulkImportResult, BulkUpdateResult } from './dto/bulk-operations.dto';
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
  onSale?: boolean;
  inStock?: boolean;
  outOfStock?: boolean;
  colors?: string[];
  sizes?: string[];
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

    // On sale filter (preserves any salePrice range set by min/maxPrice above)
    if (filters.onSale !== undefined) {
      if (filters.onSale) {
        if (!where.salePrice) {
          where.salePrice = { not: null };
        }
      } else {
        where.salePrice = null;
      }
    }

    // Stock availability filter
    if (filters.inStock !== undefined || filters.outOfStock !== undefined) {
      if (filters.inStock && !filters.outOfStock) {
        where.stock = { gt: 0 };
      } else if (filters.outOfStock && !filters.inStock) {
        where.stock = { equals: 0 };
      }
      // If both true or both false/undefined: no stock filter
    }

    // Color filter — product must have at least one active variant matching the color name
    if (filters.colors && filters.colors.length > 0) {
      where.variants = {
        some: {
          color: { in: filters.colors },
          deletedAt: null,
          isActive: true,
        },
      };
    }

    // Size filter — combine with any existing variants filter
    if (filters.sizes && filters.sizes.length > 0) {
      const existingVariantsFilter =
        (where.variants as Prisma.ProductVariantListRelationFilter) || {};
      where.variants = {
        ...existingVariantsFilter,
        some: {
          ...(existingVariantsFilter.some || {}),
          size: { in: filters.sizes },
          deletedAt: null,
          isActive: true,
        },
      };
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
          where: { deletedAt: null, isActive: true },
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

  async getProductCounts(): Promise<{
    categories: Record<string, number>;
    brands: Record<string, number>;
    colors: Record<string, number>;
    inStock: number;
    outOfStock: number;
  }> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const categoryCounts: Record<string, number> = {};
    for (const category of categories) {
      categoryCounts[category.id] = await this.prisma.product.count({
        where: {
          categoryId: category.id,
          deletedAt: null,
          isActive: true,
        },
      });
    }

    // Brand counts
    const brandCountsRaw = await this.prisma.product.groupBy({
      by: ['brandId'],
      where: {
        deletedAt: null,
        isActive: true,
        brandId: { not: null },
      },
      _count: { _all: true },
    });

    const brandCounts: Record<string, number> = {};
    for (const item of brandCountsRaw) {
      if (item.brandId) {
        brandCounts[item.brandId] = item._count._all;
      }
    }

    // Color counts — sum by variant color name
    const colorVariants = await this.prisma.productVariant.groupBy({
      by: ['color'],
      where: {
        deletedAt: null,
        isActive: true,
        product: { deletedAt: null, isActive: true },
      },
      _count: { _all: true },
    });

    const colorCounts: Record<string, number> = {};
    for (const item of colorVariants) {
      colorCounts[item.color] = item._count._all;
    }

    // In stock / out of stock counts
    const inStockCount = await this.prisma.product.count({
      where: { deletedAt: null, isActive: true, stock: { gt: 0 } },
    });
    const outOfStockCount = await this.prisma.product.count({
      where: { deletedAt: null, isActive: true, stock: { equals: 0 } },
    });

    return {
      categories: categoryCounts,
      brands: brandCounts,
      colors: colorCounts,
      inStock: inStockCount,
      outOfStock: outOfStockCount,
    };
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

  async getVariantSpecsForCart(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get variants with inventory summary for stock levels
    const variants = await this.prisma.productVariant.findMany({
      where: {
        productId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        size: true,
        color: true,
        sku: true,
        salePrice: true,
        inventorySummaries: {
          select: {
            quantityAvailable: true,
          },
        },
      },
      orderBy: [{ size: 'asc' }, { color: 'asc' }],
    });

    // Format and calculate stock levels
    const formattedVariants = variants.map((variant) => {
      const totalStock = variant.inventorySummaries.reduce(
        (sum, summary) => sum + summary.quantityAvailable,
        0,
      );

      return {
        id: variant.id,
        size: variant.size,
        color: variant.color,
        salePrice: variant.salePrice ? Number(variant.salePrice) : undefined,
        stock: totalStock,
        isAvailable: totalStock > 0,
        sku: variant.sku,
      };
    });

    return {
      productId: product.id,
      variants: formattedVariants,
    };
  }

  // ── REQ-BE-013: Bulk Import / Export ──────────────────────────────

  /**
   * REQ-BE-013: Bulk import products from a parsed CSV row array.
   *
   * Expected CSV columns: name, description, basePrice, salePrice, stock,
   * categoryId, isRentable, isSellable, isFeatured, fabric, hsnCode.
   *
   * Each row is validated individually; errors are collected and returned
   * alongside the count of successfully imported products.
   */
  async bulkImport(
    rows: Array<Record<string, string>>,
    adminId: string,
  ): Promise<BulkImportResult> {
    const errors: Array<{ row: number; message: string }> = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for 1-based + header row

      try {
        const name = row.name?.trim();
        if (!name) {
          errors.push({ row: rowNum, message: 'name is required' });
          continue;
        }

        const basePrice = parseFloat(row.basePrice);
        if (Number.isNaN(basePrice) || basePrice < 0) {
          errors.push({ row: rowNum, message: 'basePrice must be a non-negative number' });
          continue;
        }

        const categoryId = row.categoryId?.trim();
        if (!categoryId) {
          errors.push({ row: rowNum, message: 'categoryId is required' });
          continue;
        }

        // Verify category exists
        const category = await this.prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          errors.push({ row: rowNum, message: `Category ${categoryId} not found` });
          continue;
        }

        const slug = slugify(name);
        const salePrice = row.salePrice ? parseFloat(row.salePrice) : null;
        const stock = row.stock ? parseInt(row.stock, 10) : 0;

        await this.prisma.product.create({
          data: {
            name,
            slug,
            description: row.description?.trim() ?? null,
            basePrice,
            salePrice: salePrice && !Number.isNaN(salePrice) ? salePrice : null,
            stock: Number.isNaN(stock) ? 0 : stock,
            categoryId,
            isRentable: row.isRentable?.toLowerCase() === 'true',
            isSellable: row.isSellable?.toLowerCase() !== 'false',
            isFeatured: row.isFeatured?.toLowerCase() === 'true',
            fabric: row.fabric?.trim() ?? null,
            hsnCode: row.hsnCode?.trim() ?? null,
            images: [],
            isActive: true,
          },
        });

        imported++;
        this.logger.log({
          row: rowNum,
          name,
          adminId,
          action: 'product.bulk_import.row_imported',
        });
      } catch (error) {
        errors.push({
          row: rowNum,
          message: (error as Error).message ?? 'Unknown error',
        });
      }
    }

    this.logger.log({
      imported,
      errors: errors.length,
      total: rows.length,
      adminId,
      action: 'product.bulk_import.complete',
    });

    return { imported, errors, total: rows.length };
  }

  /**
   * REQ-BE-013: Bulk update products (price, stock, status changes).
   */
  async bulkUpdate(dto: BulkUpdateDto, adminId: string): Promise<BulkUpdateResult> {
    const errors: Array<{ productId: string; message: string }> = [];
    let updated = 0;

    for (const item of dto.updates) {
      try {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          errors.push({ productId: item.productId, message: 'Product not found' });
          continue;
        }

        const data: Prisma.ProductUpdateInput = {};
        if (item.basePrice !== undefined) data.basePrice = item.basePrice;
        if (item.salePrice !== undefined) data.salePrice = item.salePrice;
        if (item.stock !== undefined) data.stock = item.stock;
        if (item.isActive !== undefined) data.isActive = item.isActive;
        if (item.isFeatured !== undefined) data.isFeatured = item.isFeatured;

        await this.prisma.product.update({
          where: { id: item.productId },
          data,
        });

        updated++;
      } catch (error) {
        errors.push({
          productId: item.productId,
          message: (error as Error).message ?? 'Unknown error',
        });
      }
    }

    this.logger.log({
      updated,
      errors: errors.length,
      total: dto.updates.length,
      adminId,
      action: 'product.bulk_update.complete',
    });

    return { updated, errors, total: dto.updates.length };
  }

  /**
   * REQ-BE-013: Export all products as a flat array for CSV/Excel generation.
   * Returns raw rows — the controller handles file format conversion.
   */
  async exportAll(): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      basePrice: number;
      salePrice: number | null;
      stock: number;
      isActive: boolean;
      isFeatured: boolean;
      isRentable: boolean;
      isSellable: boolean;
      categoryId: string;
      brandId: string | null;
      fabric: string | null;
      hsnCode: string | null;
      createdAt: Date;
    }>
  > {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePrice: true,
        salePrice: true,
        stock: true,
        isActive: true,
        isFeatured: true,
        isRentable: true,
        isSellable: true,
        categoryId: true,
        brandId: true,
        fabric: true,
        hsnCode: true,
        createdAt: true,
      },
    });

    return products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      salePrice: p.salePrice ? Number(p.salePrice) : null,
    }));
  }
}
