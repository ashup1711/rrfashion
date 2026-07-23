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
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductImagesService } from './product-images.service';
import { ReorderImagesDto } from './dto/reorder-images.dto';
import { ImageUploadService } from '../upload/image-upload.service';
import { unlink } from 'fs/promises';

@ApiTags('Product Images')
@Controller('products/:productId/variants/:variantId/images')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class ProductImagesController {
  constructor(
    private readonly service: ProductImagesService,
    private readonly uploadService: ImageUploadService,
  ) {}

  @Post()
  @HttpCode(202)
  @UseInterceptors(FilesInterceptor('images', 10))
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
  async upload(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ uploadId: string; status: string }> {
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
