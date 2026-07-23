import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../../storage/storage.service';
import { RedisService } from '../../redis/redis.service';

export interface TempUploadMetadata {
  tempId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  expiresAt: string;
}

export interface TempUploadResponse {
  tempId: string;
  url: string;
  storageKey: string;
  expiresAt: string;
}

const TEMP_UPLOAD_TTL_SECONDS = 86400; // 24 hours
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class TempUploadService {
  private readonly logger = new Logger(TempUploadService.name);

  constructor(
    private readonly storage: StorageService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async uploadTempImage(file: Express.Multer.File): Promise<TempUploadResponse> {
    // Validate file
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const tempId = uuidv4();
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `temp/${tempId}/${timestamp}-${safeName}`;

    // Upload to S3
    const key = await this.storage.upload(storageKey, file.buffer, file.mimetype);
    const url = this.storage.getPublicUrl(key);

    // Calculate expiration
    const expiresAt = new Date(Date.now() + TEMP_UPLOAD_TTL_SECONDS * 1000).toISOString();

    // Store metadata in Redis with TTL
    const metadata: TempUploadMetadata = {
      tempId,
      storageKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    await this.redis.set(
      `temp:upload:${tempId}`,
      JSON.stringify(metadata),
      TEMP_UPLOAD_TTL_SECONDS,
    );

    this.logger.log(`Temp upload created: ${tempId}, key: ${storageKey}`);

    return {
      tempId,
      url,
      storageKey,
      expiresAt,
    };
  }

  async deleteTempImage(tempId: string): Promise<void> {
    const metadataStr = await this.redis.get(`temp:upload:${tempId}`);

    if (!metadataStr) {
      this.logger.warn(`Temp upload not found: ${tempId}`);
      return; // Already deleted or expired
    }

    const metadata: TempUploadMetadata = JSON.parse(metadataStr);

    // Delete from S3 (best-effort)
    try {
      await this.storage.delete(metadata.storageKey);
      this.logger.log(`Deleted temp file from storage: ${metadata.storageKey}`);
    } catch (error) {
      this.logger.warn(`Failed to delete temp file from storage: ${metadata.storageKey}`, error);
    }

    // Delete Redis key
    await this.redis.del(`temp:upload:${tempId}`);
    this.logger.log(`Deleted temp upload metadata: ${tempId}`);
  }

  async getTempImageMetadata(tempId: string): Promise<TempUploadMetadata | null> {
    const metadataStr = await this.redis.get(`temp:upload:${tempId}`);
    if (!metadataStr) {
      return null;
    }
    return JSON.parse(metadataStr) as TempUploadMetadata;
  }
}
