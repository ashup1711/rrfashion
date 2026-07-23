import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { ImageUploadJobData } from './processors/image-upload.processor';

export interface QueueResult {
  uploadId: string;
  status: 'processing';
}

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);

  constructor(
    @InjectQueue('image-upload-queue') private readonly uploadQueue: Queue<ImageUploadJobData>,
  ) {}

  async queueVariantImageUpload(
    productId: string,
    variantId: string,
    files: Express.Multer.File[],
  ): Promise<QueueResult> {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    const uploadId = uuidv4();

    for (const file of files) {
      const jobData: ImageUploadJobData = {
        uploadId,
        tempFilePath: file.path,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        productId,
        variantId,
        uploadType: 'variant_image',
      };

      await this.uploadQueue.add(`variant-image-${uploadId}`, jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400, count: 50 },
      });
    }

    this.logger.log(`Queued ${files.length} variant image(s) for upload: ${uploadId}`);

    return { uploadId, status: 'processing' };
  }

  async queueProfilePhotoUpload(userId: string, file: Express.Multer.File): Promise<QueueResult> {
    if (!file) {
      throw new Error('No file provided');
    }

    const uploadId = uuidv4();

    const jobData: ImageUploadJobData = {
      uploadId,
      tempFilePath: file.path,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      userId,
      uploadType: 'profile_photo',
    };

    await this.uploadQueue.add(`profile-photo-${uploadId}`, jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 86400, count: 50 },
    });

    this.logger.log(`Queued profile photo upload: ${uploadId}`);

    return { uploadId, status: 'processing' };
  }
}
