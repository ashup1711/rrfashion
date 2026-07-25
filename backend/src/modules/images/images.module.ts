import { Module } from '@nestjs/common';
import { ImagesController } from './images.controller';
import { StorageModule } from '../../storage/storage.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [StorageModule, PrismaModule],
  controllers: [ImagesController],
})
export class ImagesModule {}
