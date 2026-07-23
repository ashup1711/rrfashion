import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
}

/** Key metadata fields extracted from Sharp processing */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string | undefined;
  space: string | undefined;
  /** Raw metadata object from Sharp */
  raw: Record<string, unknown>;
}

export interface ImageProcessingResult {
  original: ProcessedImage;
  medium: ProcessedImage;
  thumbnail: ProcessedImage;
  /** Metadata from the source image */
  metadata: ImageMetadata;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  /**
   * Process an image file from disk through Sharp:
   * - Original: max 2000px, WebP 90%
   * - Medium: 800px, WebP 85%
   * - Thumbnail: 300px cover, WebP 80%
   *
   * All three variants are generated in parallel for performance.
   */
  async processImage(filePath: string): Promise<ImageProcessingResult> {
    const rawMetadata = await sharp(filePath).metadata();
    this.logger.log(`Processing image: ${rawMetadata.width}x${rawMetadata.height}`);

    const metadata: ImageMetadata = {
      width: rawMetadata.width ?? 0,
      height: rawMetadata.height ?? 0,
      format: rawMetadata.format,
      space: rawMetadata.space,
      raw: rawMetadata as unknown as Record<string, unknown>,
    };

    const [originalBuffer, mediumBuffer, thumbnailBuffer] = await Promise.all([
      sharp(filePath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer(),
      sharp(filePath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
      sharp(filePath).resize(300, 300, { fit: 'cover' }).webp({ quality: 80 }).toBuffer(),
    ]);

    const [originalMeta, mediumMeta, thumbMeta] = await Promise.all([
      sharp(originalBuffer).metadata(),
      sharp(mediumBuffer).metadata(),
      sharp(thumbnailBuffer).metadata(),
    ]);

    return {
      original: {
        buffer: originalBuffer,
        width: originalMeta.width ?? 0,
        height: originalMeta.height ?? 0,
        size: originalBuffer.length,
      },
      medium: {
        buffer: mediumBuffer,
        width: mediumMeta.width ?? 0,
        height: mediumMeta.height ?? 0,
        size: mediumBuffer.length,
      },
      thumbnail: {
        buffer: thumbnailBuffer,
        width: thumbMeta.width ?? 0,
        height: thumbMeta.height ?? 0,
        size: thumbnailBuffer.length,
      },
      metadata,
    };
  }
}
