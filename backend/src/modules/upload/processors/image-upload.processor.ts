import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../../storage/storage.service';
import { ImageProcessingService } from '../../products/image-processing.service';
import { RedisService } from '../../../redis/redis.service';
import { unlink } from 'fs/promises';
import * as path from 'path';

export interface ImageUploadJobData {
  uploadId: string;
  tempFilePath: string;
  originalFilename: string;
  mimeType: string;
  productId?: string;
  variantId?: string;
  userId?: string;
  uploadType: 'variant_image' | 'profile_photo';
}

export interface ImageUploadProgress {
  uploadId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  images?: unknown[];
  photoUrl?: string;
}

const UPLOAD_PROGRESS_TTL_SECONDS = 3600; // 1 hour
const PROGRESS_KEYS = {
  processing: 10,
  processingVariants: 20,
  uploadingOriginal: 30,
  uploadingMedium: 50,
  uploadingThumbnail: 70,
  completed: 100,
};

@Processor('image-upload-queue', {
  concurrency: 3, // Process 3 uploads concurrently
})
export class ImageUploadProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageUploadProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imageProcessor: ImageProcessingService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job<ImageUploadJobData>): Promise<void> {
    const { uploadId, tempFilePath, originalFilename, productId, variantId, userId, uploadType } =
      job.data;

    this.logger.log(`Processing upload: ${uploadId} (${uploadType})`);

    try {
      // Emit progress: 10% - Starting
      await this.emitProgress(
        uploadId,
        'processing',
        PROGRESS_KEYS.processing,
        'Starting image processing',
      );

      if (uploadType === 'variant_image' && variantId) {
        void productId;
        await this.processVariantImage(job, uploadId, tempFilePath, originalFilename, variantId);
      } else if (uploadType === 'profile_photo' && userId) {
        await this.processProfilePhoto(job, uploadId, tempFilePath, userId);
      }

      this.logger.log(`Upload completed: ${uploadId}`);
    } catch (error) {
      this.logger.error(`Upload failed: ${uploadId}`, error);
      await this.emitProgress(uploadId, 'failed', 0, (error as Error).message);
      throw error; // Let BullMQ handle retry
    } finally {
      // Always clean up temp file
      await unlink(tempFilePath).catch(() => {
        this.logger.warn(`Failed to cleanup temp file: ${tempFilePath}`);
      });
    }
  }

  private async processVariantImage(
    job: Job<ImageUploadJobData>,
    uploadId: string,
    tempFilePath: string,
    originalFilename: string,
    variantId: string,
  ): Promise<void> {
    // Progress: 20% - Processing image
    await job.updateProgress(PROGRESS_KEYS.processingVariants);
    await this.emitProgress(
      uploadId,
      'processing',
      PROGRESS_KEYS.processingVariants,
      'Processing image variants',
    );

    const processed = await this.imageProcessor.processImage(tempFilePath);
    const baseKey = `products/${variantId}/${Date.now()}-${path.basename(originalFilename, path.extname(originalFilename))}`;

    const variants = [
      { type: 'ORIGINAL' as const, key: `${baseKey}/original.webp`, data: processed.original },
      { type: 'MEDIUM' as const, key: `${baseKey}/medium.webp`, data: processed.medium },
      { type: 'THUMBNAIL' as const, key: `${baseKey}/thumbnail.webp`, data: processed.thumbnail },
    ];

    const images: unknown[] = [];
    let parentId: string | null = null;

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const progress = PROGRESS_KEYS.uploadingOriginal + i * 20; // 30%, 50%, 70%

      await job.updateProgress(progress);
      await this.emitProgress(
        uploadId,
        'processing',
        progress,
        `Uploading ${v.type.toLowerCase()} variant`,
      );

      const key = await this.storage.upload(v.key, v.data.buffer, 'image/webp');
      const url = this.storage.getPublicUrl(key);

      const createdImage: Record<string, unknown> = await this.prisma.productImage.create({
        data: {
          variantId,
          url,
          storageKey: v.key,
          sortOrder: 0,
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
          storageKey: true,
          variantType: true,
          width: true,
          height: true,
          fileSize: true,
          mimeType: true,
        },
      });

      if (v.type === 'ORIGINAL') {
        parentId = createdImage.id as string;
      }
      images.push(createdImage);
    }

    // Sync top-level Product.images
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });
    if (variant) {
      const topImages = await this.prisma.productImage.findMany({
        where: {
          variant: { productId: variant.productId, deletedAt: null },
          variantType: 'ORIGINAL',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { url: true },
      });
      await this.prisma.product.update({
        where: { id: variant.productId },
        data: {
          images: topImages.map((img) => img.url),
          version: { increment: 1 },
        },
      });
    }

    // Progress: 100% - Completed
    await this.emitProgress(
      uploadId,
      'completed',
      PROGRESS_KEYS.completed,
      'Upload completed',
      images,
    );
  }

  private async processProfilePhoto(
    job: Job<ImageUploadJobData>,
    uploadId: string,
    tempFilePath: string,
    userId: string,
  ): Promise<void> {
    await job.updateProgress(PROGRESS_KEYS.processingVariants);
    await this.emitProgress(
      uploadId,
      'processing',
      PROGRESS_KEYS.processingVariants,
      'Processing profile photo',
    );

    // Process image: resize to 500x500, WebP
    const processed = await this.imageProcessor.processImage(tempFilePath);
    const key = `profiles/${userId}/${Date.now()}.webp`;

    await job.updateProgress(PROGRESS_KEYS.uploadingOriginal);
    await this.emitProgress(
      uploadId,
      'processing',
      PROGRESS_KEYS.uploadingOriginal,
      'Uploading to storage',
    );

    const uploadKey = await this.storage.upload(key, processed.original.buffer, 'image/webp');
    const url = this.storage.getPublicUrl(uploadKey);

    // Get old photo for deletion
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhotoKey: true },
    });

    // Update user record
    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: url, profilePhotoKey: key },
    });

    // Delete old photo if exists
    if (user?.profilePhotoKey) {
      await this.storage.delete(user.profilePhotoKey).catch(() => {});
    }

    await this.emitProgress(
      uploadId,
      'completed',
      PROGRESS_KEYS.completed,
      'Profile photo updated',
      undefined,
      url,
    );
  }

  private async emitProgress(
    uploadId: string,
    status: ImageUploadProgress['status'],
    progress: number,
    message: string,
    images?: unknown[],
    photoUrl?: string,
  ): Promise<void> {
    const payload: ImageUploadProgress = {
      uploadId,
      status,
      progress,
      message,
      ...(images !== undefined && { images }),
      ...(photoUrl !== undefined && { photoUrl }),
    };

    // Store in Redis for SSE clients to retrieve
    await this.redis.set(
      `upload:${uploadId}:progress`,
      JSON.stringify(payload),
      UPLOAD_PROGRESS_TTL_SECONDS,
    );

    // Also publish to Redis channel for real-time updates
    const client = this.redis.getClient();
    await client.publish(`upload:${uploadId}`, JSON.stringify(payload));
  }
}
