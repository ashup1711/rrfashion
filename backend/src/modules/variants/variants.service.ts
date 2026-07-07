import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async findByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.productVariant.findMany({
      where: {
        productId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            url: true,
            altText: true,
            sortOrder: true,
            sizeType: true,
          },
        },
      },
      orderBy: [{ color: 'asc' }, { size: 'asc' }],
    });
  }

  async create(productId: string, dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check SKU uniqueness
    const existingSku = await this.prisma.productVariant.findUnique({
      where: { sku: dto.sku },
    });

    if (existingSku) {
      throw new ConflictException('A variant with this SKU already exists');
    }

    // Check barcode uniqueness if provided
    if (dto.barcode) {
      const existingBarcode = await this.prisma.productVariant.findUnique({
        where: { barcode: dto.barcode },
      });
      if (existingBarcode) {
        throw new ConflictException('A variant with this barcode already exists');
      }
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        size: dto.size,
        color: dto.color,
        sku: dto.sku,
        barcode: dto.barcode ?? null,
        salePrice: dto.salePrice ?? null,
        rentPricePerDay: dto.rentPricePerDay ?? null,
        securityDeposit: dto.securityDeposit ?? null,
        weightGrams: dto.weightGrams ?? null,
        isActive: true,
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (dto.initialStock && dto.initialStock.length > 0) {
      for (const stock of dto.initialStock) {
        await this.inventoryService.adjustStock(
          variant.id,
          stock.storeId,
          stock.quantity,
          'PURCHASE',
          'Initial stock on variant creation',
          null,
        );
      }
    }

    await this.syncProductStock(productId);
    return variant;
  }

  async update(id: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (dto.sku && dto.sku !== variant.sku) {
      const existing = await this.prisma.productVariant.findUnique({
        where: { sku: dto.sku },
      });
      if (existing) {
        throw new ConflictException('A variant with this SKU already exists');
      }
    }

    if (dto.barcode && dto.barcode !== variant.barcode) {
      const existing = await this.prisma.productVariant.findUnique({
        where: { barcode: dto.barcode },
      });
      if (existing) {
        throw new ConflictException('A variant with this barcode already exists');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.size !== undefined) updateData.size = dto.size;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.barcode !== undefined) updateData.barcode = dto.barcode;
    if (dto.salePrice !== undefined) updateData.salePrice = dto.salePrice;
    if (dto.rentPricePerDay !== undefined) updateData.rentPricePerDay = dto.rentPricePerDay;
    if (dto.securityDeposit !== undefined) updateData.securityDeposit = dto.securityDeposit;
    if (dto.weightGrams !== undefined) updateData.weightGrams = dto.weightGrams;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: updateData,
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (dto.initialStock && dto.initialStock.length > 0) {
      for (const stock of dto.initialStock) {
        const current = await this.prisma.inventorySummary.findUnique({
          where: { variantId_storeId: { variantId: id, storeId: stock.storeId } },
        });
        const currentAvailable = current?.quantityAvailable ?? 0;
        const quantityChange = stock.quantity - currentAvailable;

        if (quantityChange !== 0) {
          await this.inventoryService.adjustStock(
            id,
            stock.storeId,
            quantityChange,
            'ADJUSTMENT',
            'Stock updated on variant edit',
            null,
          );
        }
      }
    }

    if (dto.initialStock && dto.initialStock.length > 0) {
      await this.syncProductStock(variant.productId);
    }

    return updated;
  }

  private async syncProductStock(productId: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    const summaries = await this.prisma.inventorySummary.groupBy({
      by: ['variantId'],
      where: { variantId: { in: variants.map((v) => v.id) } },
      _sum: { quantityAvailable: true },
    });

    const totalStock = summaries.reduce((sum, s) => sum + (s._sum.quantityAvailable ?? 0), 0);

    await this.prisma.product.update({
      where: { id: productId },
      data: { stock: totalStock },
    });
  }

  async remove(id: string): Promise<void> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    // Soft delete
    await this.prisma.productVariant.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
