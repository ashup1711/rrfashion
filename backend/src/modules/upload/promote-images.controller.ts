import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PromoteImagesService, PromoteImageRequest, PromotedImage } from './promote-images.service';

@ApiTags('Product Images')
@Controller('products/:productId/variants/:variantId')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class PromoteImagesController {
  constructor(private readonly promoteImagesService: PromoteImagesService) {}

  @Post('promote-images')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Promote temporary images to permanent product variant images' })
  @ApiCreatedResponse({
    description: 'Images promoted successfully',
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              url: { type: 'string' },
              variantId: { type: 'string' },
              sortOrder: { type: 'number' },
              variantType: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Variant not found or temp image not found' })
  @ApiBadRequestResponse({ description: 'No temporary images provided' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired admin token' })
  async promoteImages(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() body: { tempImages: PromoteImageRequest[] },
  ): Promise<{ images: PromotedImage[] }> {
    const images = await this.promoteImagesService.promoteImages(
      productId,
      variantId,
      body.tempImages,
    );
    return { images };
  }
}
