import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Logger,
  NotFoundException,
  BadRequestException,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { StorageService } from '../../storage/storage.service';
import sharp, { ResizeOptions } from 'sharp';

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  private readonly logger = new Logger(ImagesController.name);

  constructor(private readonly storage: StorageService) {}

  @Get('proxy/:key(*)')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @ApiOperation({ summary: 'Serve and transform images via proxy' })
  @ApiQuery({ name: 'w', required: false, description: 'Width in pixels' })
  @ApiQuery({ name: 'h', required: false, description: 'Height in pixels' })
  @ApiQuery({ name: 'q', required: false, description: 'Quality 1-100 (WebP only)' })
  @ApiQuery({ name: 'fmt', required: false, description: 'Format: webp, jpeg, png' })
  @ApiOkResponse({ description: 'Image streamed with optional transformations' })
  @ApiNotFoundResponse({ description: 'Image not found' })
  async getImage(
    @Param('key') key: string,
    @Query('w') width?: string,
    @Query('h') height?: string,
    @Query('q') quality?: string,
    @Query('fmt') format?: string,
    @Res() res?: Response,
  ): Promise<void> {
    try {
      const buffer = await this.storage.download(key);
      if (!buffer) {
        throw new NotFoundException('Image not found');
      }

      let image = sharp(buffer);

      // Apply transformations if requested
      const resizeOptions: ResizeOptions = {};
      if (width) resizeOptions.width = parseInt(width, 10);
      if (height) resizeOptions.height = parseInt(height, 10);
      if (Object.keys(resizeOptions).length > 0) {
        image = image.resize({
          ...resizeOptions,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const qualityNum = quality ? Math.min(100, Math.max(1, parseInt(quality, 10))) : 85;
      const fmt = format || 'webp';

      switch (fmt) {
        case 'jpeg':
        case 'jpg':
          res!.setHeader('Content-Type', 'image/jpeg');
          const jpegBuf = await image.jpeg({ quality: qualityNum }).toBuffer();
          res!.send(jpegBuf);
          break;
        case 'png':
          res!.setHeader('Content-Type', 'image/png');
          const pngBuf = await image.png().toBuffer();
          res!.send(pngBuf);
          break;
        case 'webp':
        default:
          res!.setHeader('Content-Type', 'image/webp');
          const webpBuf = await image.webp({ quality: qualityNum }).toBuffer();
          res!.send(webpBuf);
          break;
      }
    } catch (error) {
      this.logger.error(`Image proxy failed for key: ${key}`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Image processing failed');
    }
  }
}
