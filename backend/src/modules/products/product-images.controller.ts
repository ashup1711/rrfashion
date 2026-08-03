import {
  Controller,
  Post,
  Delete,
  Patch,
  Param,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Body,
  HttpCode,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiAcceptedResponse,
  ApiPayloadTooLargeResponse,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductImagesService } from './product-images.service';
import { ReorderImagesDto } from './dto/reorder-images.dto';
import { ImageUploadService } from '../upload/image-upload.service';
import { unlink } from 'fs/promises';

const DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (REQ-BE-014)

@ApiTags('Product Images')
@Controller('products/:productId/variants/:variantId/images')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class ProductImagesController {
  private readonly productImageMaxBytes: number;

  constructor(
    private readonly service: ProductImagesService,
    private readonly uploadService: ImageUploadService,
    private readonly config: ConfigService,
  ) {
    const raw = parseInt(this.config.get<string>('UPLOAD_MAX_FILE_SIZE_BYTES', '') ?? '', 10);
    this.productImageMaxBytes =
      Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES;
  }

  @Post()
  @HttpCode(202)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      // REQ-BE-013 / REQ-BE-014: per-file size limit. Global limit stays
      // in ImageUploadModule; we tighten further here per route.
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload variant images (async with progress tracking)' })
  @ApiAcceptedResponse({ description: 'Upload accepted, processing in background' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired admin token' })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  @ApiPayloadTooLargeResponse({
    description: `Any file exceeded the per-file limit (default ${DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES} bytes)`,
  })
  async upload(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ uploadId: string; status: string }> {
    // REQ-BE-013 / REQ-BE-014: enforce the per-file size cap *after* multer
    // has accepted the upload (the multer limits above are the hard ceiling
    // for DoS protection; this is the per-route cap that aligns with the
    // configured max). Files exceeding the cap are deleted and the request
    // rejected with a clear 413.
    const oversize: Array<{ name: string; size: number }> = [];
    for (const file of files) {
      if (file.size > this.productImageMaxBytes) {
        oversize.push({ name: file.originalname, size: file.size });
        await unlink(file.path).catch(() => {});
      }
    }
    if (oversize.length > 0) {
      throw new PayloadTooLarge(
        `File(s) exceed the ${this.productImageMaxBytes}-byte limit: ${oversize.map((f) => `${f.name} (${f.size}B)`).join(', ')}`,
      );
    }

    try {
      return await this.uploadService.queueVariantImageUpload(productId, variantId, files);
    } catch (error) {
      for (const file of files) {
        await unlink(file.path).catch(() => {});
      }
      throw error;
    }
  }

  @Delete(':imageId')
  @ApiOperation({ summary: 'Delete a variant image (including storage files)' })
  @ApiOkResponse({ description: 'Image deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired admin token' })
  @ApiNotFoundResponse({ description: 'Image not found' })
  async delete(
    @Param('productId') _productId: string,
    @Param('variantId') variantId: string,
    @Param('imageId') imageId: string,
  ): Promise<{ deleted: boolean; imageId: string }> {
    return this.service.deleteImage(variantId, imageId);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder variant images' })
  @ApiOkResponse({ description: 'Images reordered successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired admin token' })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  @ApiConflictResponse({ description: 'Invalid order data' })
  async reorder(
    @Param('variantId') variantId: string,
    @Body() dto: ReorderImagesDto,
  ): Promise<{ reordered: number }> {
    return this.service.reorderImages(variantId, dto.orders);
  }
}

// Local 413 exception kept inline so the controller does not pull in a new
// dependency for a single use. Mirrors the shape of NestJS's built-in
// PayloadTooLargeException but is exported as a thin helper.
import { HttpException, HttpStatus } from '@nestjs/common';
class PayloadTooLarge extends HttpException {
  constructor(message: string) {
    super({ message, statusCode: HttpStatus.PAYLOAD_TOO_LARGE }, HttpStatus.PAYLOAD_TOO_LARGE);
  }
}
