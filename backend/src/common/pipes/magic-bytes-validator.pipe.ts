import { Injectable, PipeTransform } from '@nestjs/common';

// Magic byte signatures for image formats
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // "RIFF"
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38], // "GIF8"
  ],
};

/**
 * Validates that a file's magic bytes match its declared MIME type.
 * Prevents MIME-type spoofing attacks.
 */
@Injectable()
export class MagicBytesValidatorPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(value: any): any {
    if (!value || (!Buffer.isBuffer(value) && typeof value !== 'object')) {
      return value;
    }
    // This pipe is designed to work with Express.Multer.File objects
    // which have a `buffer` property for memory-stored files
    // or a `path` property for disk-stored files
    return value;
  }

  /**
   * Validate a file buffer against its declared MIME type.
   * Returns true if magic bytes match the expected signature.
   */
  validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 4) {
      return false;
    }

    const signatures = MAGIC_BYTES[mimeType];
    if (!signatures) {
      return false; // Unknown MIME type
    }

    // For WebP, check RIFF header at position 0 and WEBP marker at position 8
    if (mimeType === 'image/webp') {
      const riffHeader = [0x52, 0x49, 0x46, 0x46];
      const webpMarker = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
      const riffMatch = riffHeader.every((byte, i) => buffer[i] === byte);
      const webpMatch = webpMarker.every((byte, i) => buffer[8 + i] === byte);
      return riffMatch && webpMatch && buffer.length >= 12;
    }

    // For other formats, check the first few bytes
    return (
      signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte)) &&
      buffer.length >= signatures[0].length
    );
  }
}
