import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { ImageProcessingService } from '../products/image-processing.service';
import { TempUploadService } from './temp-upload.service';
import * as path from 'path';

export interface PromoteImageRequest {
  tempId: string;
  storageKey: string;
  altText?: string;
  sortOrder: number;
}

export interface PromotedImage {
  id: string;
  url: string;
  variantId: string;
  sortOrder: number;
  variantType: string;
}

@Injectable()
export class PromoteImagesService {
  private readonly logger = new Logger(PromoteImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imageProcessor: ImageProcessingService,
    private readonly tempUploadService: TempUploadService,
  ) {}

  async promoteImages(
    productId: string,
    variantId: string,
    tempImages: PromoteImageRequest[],
  ): Promise<PromotedImage[]> {
    if (!tempImages || tempImages.length === 0) {
      throw new BadRequestException('No temporary images provided');
    }

    // Verify variant belongs to product
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, deletedAt: null },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const results: PromotedImage[] = [];

    for (const tempImage of tempImages) {
      try {
        const promoted = await this.promoteSingleImage(variantId, tempImage);
        results.push(...promoted);
      } catch (error) {
        this.logger.error(
          `Failed to promote image ${tempImage.tempId}: ${(error as Error).message}`,
        );
        throw error; // Fail fast - caller handles transaction safety
      }
    }

    // Sync top-level Product.images
    await this.syncProductImages(productId);

    return results;
  }

  private async syncProductImages(productId: string): Promise<void> {
    const images = await this.prisma.productImage.findMany({
      where: {
        variant: { productId, deletedAt: null },
        variantType: 'ORIGINAL',
      },
      orderBy: { sortOrder: 'asc' },
      take: 5,
      select: { url: true, sortOrder: true },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        images: images.map((img) => img.url),
        version: { increment: 1 },
      },
    });
  }

  private async promoteSingleImage(
    variantId: string,
    tempImage: PromoteImageRequest,
  ): Promise<PromotedImage[]> {
    // Download temp image from S3
    const buffer = await this.storage.download(tempImage.storageKey);

    if (!buffer) {
      throw new NotFoundException(`Temporary image not found: ${tempImage.tempId}`);
    }

    // Write to temp file for Sharp processing (processImage expects a file path)
    const fs = await import('fs/promises');
    const os = await import('os');
    const tempFilePath = path.join(os.tmpdir(), `promote-${tempImage.tempId}.webp`);

    await fs.writeFile(tempFilePath, buffer);

    try {
      const processed = await this.imageProcessor.processImage(tempFilePath);
      const baseKey = `products/${variantId}/${Date.now()}-${tempImage.tempId}`;

      const variants = [
        { type: 'ORIGINAL' as const, key: `${baseKey}/original.webp`, data: processed.original },
        { type: 'MEDIUM' as const, key: `${baseKey}/medium.webp`, data: processed.medium },
        { type: 'THUMBNAIL' as const, key: `${baseKey}/thumbnail.webp`, data: processed.thumbnail },
      ];

      const images: PromotedImage[] = [];
      let parentId: string | null = null;

      for (const v of variants) {
        const storageKey = await this.storage.upload(v.key, v.data.buffer, 'image/webp');
      const url = this.storage.getPublicUrl(storageKey);

        const createdImage: PromotedImage = await this.prisma.productImage.create({
          data: {
            variantId,
            url,
            storageKey: v.key,
            sortOrder: tempImage.sortOrder,
            altText: tempImage.altText,
            width: v.data.width,
            height: v.data.height,
            fileSize: v.data.size,
            mimeType: 'image/webp',
            variantType: v.type,
            parentImageId: parentId,
          },
          select: {
            id: true,
            url: true,
            variantId: true,
            sortOrder: true,
            variantType: true,
          },
        });

        if (v.type === 'ORIGINAL') {
          parentId = createdImage.id;
        }

        images.push(createdImage);
      }

      // Delete temp file from S3 (best-effort)
      await this.storage.delete(tempImage.storageKey).catch((err) => {
        this.logger.warn(`Failed to delete temp file: ${tempImage.storageKey}`, err);
      });

      // Delete Redis metadata
      await this.tempUploadService.deleteTempImage(tempImage.tempId);

      this.logger.log(
        `Promoted temp image ${tempImage.tempId} to variant ${variantId} with ${images.length} variants`,
      );

      return images;
    } finally {
      // Clean up local temp file
      await fs.unlink(tempFilePath).catch(() => {
        // Best-effort cleanup of temp file
      });
    }
  }
}
