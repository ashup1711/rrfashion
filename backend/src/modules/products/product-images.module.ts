import { Module, forwardRef } from '@nestjs/common';
import { ProductImagesController } from './product-images.controller';
import { ProductImagesService } from './product-images.service';
import { ImageProcessingService } from './image-processing.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';
import { ImageUploadModule } from '../upload/image-upload.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    forwardRef(() => ImageUploadModule),
  ],
  controllers: [ProductImagesController],
  providers: [ProductImagesService, ImageProcessingService],
  exports: [ProductImagesService, ImageProcessingService],
})
export class ProductImagesModule {}
