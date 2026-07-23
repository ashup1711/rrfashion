import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { ImageProcessingService } from './image-processing.service';
import { unlink } from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ProductImagesService {
  private readonly logger = new Logger(ProductImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imageProcessor: ImageProcessingService,
  ) {}

  async uploadImages(
    productId: string,
    variantId: string,
    files: Express.Multer.File[],
  ): Promise<{ uploaded: number; images: unknown[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Verify variant belongs to product
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, deletedAt: null },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const existingCount = await this.prisma.productImage.count({
      where: { variantId },
    });

    const results = await Promise.all(
      files.map(async (file, index) => {
        try {
          return await this.processAndUpload(file, variantId, existingCount + index);
        } finally {
          // Always clean up temp file after processing
          await unlink(file.path).catch(() => {
            this.logger.warn(`Failed to cleanup temp file: ${file.path}`);
          });
        }
      }),
    );

    await this.syncProductImages(productId);

    return { uploaded: results.length, images: results.flat() };
  }

  private async processAndUpload(
    file: Express.Multer.File,
    variantId: string,
    sortOrder: number,
  ): Promise<unknown[]> {
    const processed = await this.imageProcessor.processImage(file.path);
    const baseKey = `products/${variantId}/${Date.now()}-${path.basename(file.originalname, path.extname(file.originalname))}`;

    const variants = [
      { type: 'ORIGINAL' as const, key: `${baseKey}/original.webp`, data: processed.original },
      { type: 'MEDIUM' as const, key: `${baseKey}/medium.webp`, data: processed.medium },
      { type: 'THUMBNAIL' as const, key: `${baseKey}/thumbnail.webp`, data: processed.thumbnail },
    ];

    const images: Prisma.ProductImageGetPayload<Record<string, unknown>>[] = [];
    let parentId: string | null = null;

    for (const v of variants) {
      const storageKey = await this.storage.upload(v.key, v.data.buffer, 'image/webp');
      const url = this.storage.getPublicUrl(storageKey);

      const image: Prisma.ProductImageGetPayload<Record<string, unknown>> =
        await this.prisma.productImage.create({
          data: {
            variantId,
            url,
            storageKey: v.key,
            sortOrder,
            width: v.data.width,
            height: v.data.height,
            fileSize: v.data.size,
            mimeType: 'image/webp',
            variantType: v.type,
            parentImageId: parentId,
          },
        });

      // The first image (ORIGINAL) becomes the parent for subsequent variants
      if (v.type === 'ORIGINAL') {
        parentId = image.id;
      }

      images.push(image);
    }

    return images;
  }

  async deleteImage(
    variantId: string,
    imageId: string,
  ): Promise<{ deleted: boolean; imageId: string }> {
    // Fetch the image with its variant children (medium, thumbnail)
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, variantId },
      include: { variants: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Collect all storage keys to delete (parent + children)
    const storageKeys: string[] = [];
    if (image.storageKey) {
      storageKeys.push(image.storageKey);
    }
    for (const childVariant of image.variants) {
      if (childVariant.storageKey) {
        storageKeys.push(childVariant.storageKey);
      }
    }

    // Delete from storage (best-effort)
    await Promise.allSettled(storageKeys.map((key) => this.storage.delete(key)));

    // Delete from DB (cascade will remove children)
    await this.prisma.productImage.delete({ where: { id: imageId } });

    // Re-sync product images after deletion
    const deletedVariant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });
    if (deletedVariant) {
      await this.syncProductImages(deletedVariant.productId);
    }

    this.logger.log(`Deleted image ${imageId} with ${storageKeys.length} storage files`);

    return { deleted: true, imageId };
  }

  private readonly MAX_PRODUCT_IMAGES = 5;

  async syncProductImages(productId: string): Promise<void> {
    const images = await this.prisma.productImage.findMany({
      where: {
        variant: { productId, deletedAt: null },
        variantType: 'ORIGINAL',
      },
      orderBy: { createdAt: 'desc' },
      take: this.MAX_PRODUCT_IMAGES,
      select: { url: true },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        images: images.map((img) => img.url),
        version: { increment: 1 },
      },
    });
  }

  async reorderImages(
    variantId: string,
    orders: { imageId: string; sortOrder: number }[],
  ): Promise<{ reordered: number }> {
    await Promise.all(
      orders.map(({ imageId, sortOrder }) =>
        this.prisma.productImage.updateMany({
          where: { id: imageId, variantId },
          data: { sortOrder },
        }),
      ),
    );

    return { reordered: orders.length };
  }
}
