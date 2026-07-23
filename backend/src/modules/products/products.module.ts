import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductImagesModule } from './product-images.module';

@Module({
  imports: [NotificationsModule, ProductImagesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
