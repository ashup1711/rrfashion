import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ApiCommonResponse } from '../common/decorators/api-response.decorator';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { v4 as uuidv4 } from 'uuid';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  constructor(private readonly storageService: StorageService) {}

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
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    this.validateMimeType(file.mimetype);

    const key = this.generateKey(file.originalname);
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
  async uploadMultipleFiles(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    for (const file of files) {
      this.validateMimeType(file.mimetype);
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

  private generateKey(originalName: string): string {
    const uuid = uuidv4();
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `uploads/${uuid}-${safeName}`;
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
}
