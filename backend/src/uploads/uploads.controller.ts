import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  PayloadTooLargeException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ApiCommonResponse } from '../common/decorators/api-response.decorator';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { v4 as uuidv4 } from 'uuid';

// REQ-BE-013 / REQ-BE-014: defaults are the project standards (5MB for
// product images, 2MB for profile photos). Both can be overridden via
// env vars (UPLOAD_MAX_FILE_SIZE_BYTES / UPLOAD_MAX_PROFILE_SIZE_BYTES).
export const DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const DEFAULT_UPLOAD_MAX_PROFILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Resolve the per-route size cap from env, falling back to the constant
 * default. Exported as a helper so the controller can call it at class-
 * decoration time (NestJS evaluates `new MaxFileSizeValidator({ maxSize:
 * ... })` arguments before the controller constructor runs, so the size
 * must be available as a plain value, not as `this.xxx`).
 */
export function resolveUploadMaxBytes(
  config: ConfigService | undefined,
  key: 'UPLOAD_MAX_FILE_SIZE_BYTES' | 'UPLOAD_MAX_PROFILE_SIZE_BYTES',
  fallback: number,
): number {
  if (!config) return fallback;
  const raw = parseInt(config.get<string>(key, '') ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Allowed MIME types for upload. */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

@ApiTags('Uploads')
@Controller('upload')
@UseGuards(AdminJwtAuthGuard)
export class UploadsController {
  // We can't read `this.config` in a decorator argument (decorators
  // are evaluated before the constructor) so the size caps are resolved
  // lazily on first call. See `getProductMaxBytes()` / `getProfileMaxBytes()`.
  // Cached after the first read so the cost is paid once.
  private cachedProductMaxBytes: number | null = null;
  private cachedProfileMaxBytes: number | null = null;

  constructor(
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {}

  private getProductMaxBytes(): number {
    if (this.cachedProductMaxBytes === null) {
      this.cachedProductMaxBytes = resolveUploadMaxBytes(
        this.config,
        'UPLOAD_MAX_FILE_SIZE_BYTES',
        DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES,
      );
    }
    return this.cachedProductMaxBytes;
  }

  private getProfileMaxBytes(): number {
    if (this.cachedProfileMaxBytes === null) {
      this.cachedProfileMaxBytes = resolveUploadMaxBytes(
        this.config,
        'UPLOAD_MAX_PROFILE_SIZE_BYTES',
        DEFAULT_UPLOAD_MAX_PROFILE_SIZE_BYTES,
      );
    }
    return this.cachedProfileMaxBytes;
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCommonResponse({ summary: 'Upload a file', status: 201 })
  async uploadFile(@UploadedFile() file: Express.Multer.File | undefined) {
    // REQ-BE-013 / REQ-BE-014: enforce the per-route size cap manually so
    // the limit is read from env at request time (not at class-decoration
    // time, when `this.config` is not yet available). We reject oversized
    // uploads with a 413-equivalent BadRequestException so the API
    // contract stays the same as the ParseFilePipe path.
    this.assertWithinSizeLimit(file, this.getProductMaxBytes(), 'product');

    if (!file) {
      throw new BadRequestException('file is required');
    }
    this.validateMimeType(file.mimetype);
    this.assertFileType(file.mimetype, /(jpg|jpeg|png|webp)$/);

    const key = this.generateKey(file.originalname);
    const url = await this.uploadToStorage(key, file);

    return { key, url };
  }

  @Post('profile')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCommonResponse({ summary: 'Upload a profile photo (2MB max by default)', status: 201 })
  async uploadProfilePhoto(@UploadedFile() file: Express.Multer.File | undefined) {
    this.assertWithinSizeLimit(file, this.getProfileMaxBytes(), 'profile');

    if (!file) {
      throw new BadRequestException('file is required');
    }
    this.validateMimeType(file.mimetype);
    this.assertFileType(file.mimetype, /(jpg|jpeg|png|webp)$/);

    const key = this.generateKey(file.originalname, 'profile');
    const url = await this.uploadToStorage(key, file);
    return { key, url };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiCommonResponse({ summary: 'Upload multiple files', status: 201 })
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const cap = this.getProductMaxBytes();
    for (const file of files) {
      this.assertWithinSizeLimit(file, cap, 'product');
      this.validateMimeType(file.mimetype);
      this.assertFileType(file.mimetype, /(jpg|jpeg|png|webp)$/);
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const key = this.generateKey(file.originalname);
        const url = await this.uploadToStorage(key, file);
        return { key, url };
      }),
    );

    return results;
  }

  private generateKey(originalName: string, bucket: 'uploads' | 'profile' = 'uploads'): string {
    const uuid = uuidv4();
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${bucket}/${uuid}-${safeName}`;
  }

  private async uploadToStorage(key: string, file: Express.Multer.File): Promise<string> {
    await this.storageService.upload(key, file.buffer, file.mimetype);
    return this.storageService.getPublicUrl(key);
  }

  private validateMimeType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * Manually enforce the per-route size cap. Returning 413 keeps the
   * contract compatible with the prior ParseFilePipe path while
   * avoiding the "evaluate-decorator-arg-before-constructor" trap.
   */
  private assertWithinSizeLimit(
    file: Express.Multer.File | undefined,
    maxBytes: number,
    kind: 'product' | 'profile',
  ): void {
    if (!file) return;
    if (file.size > maxBytes) {
      throw new PayloadTooLargeException(
        `File exceeds the maximum allowed size for ${kind} uploads (${maxBytes} bytes; got ${file.size})`,
      );
    }
  }

  private assertFileType(mimeType: string, pattern: RegExp): void {
    // Only allow a small allow-list of known-safe image formats.
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'image/webp') {
      throw new BadRequestException(
        `Invalid file type: ${mimeType}. Allowed: jpg, jpeg, png, webp`,
      );
    }
    void pattern;
  }
}
