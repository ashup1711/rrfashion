import { Module, Global, forwardRef, Logger, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bullmq';
import { UploadController } from './upload.controller';
import { ImageUploadProcessor } from './processors/image-upload.processor';
import { ImageUploadService } from './image-upload.service';
import { TempUploadService } from './temp-upload.service';
import { TempUploadController } from './temp-upload.controller';
import { PromoteImagesService } from './promote-images.service';
import { PromoteImagesController } from './promote-images.controller';
import { TempCleanupService } from './temp-cleanup.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';
import { RedisModule } from '../../redis/redis.module';
import { ProductImagesModule } from '../products/product-images.module';
import { Injectable } from '@nestjs/common';

const TEMP_DIR = './uploads/temp';

// Ensure the temp upload directory exists at module load
mkdirSync(TEMP_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class BullQueueHealthCheck implements OnModuleInit {
  private readonly logger = new Logger(BullQueueHealthCheck.name);
  constructor(
    @InjectQueue('image-upload-queue') private readonly queue: Queue,
  ) {}
  async onModuleInit() {
    try {
      const workers = await this.queue.getWorkers();
      this.logger.log(`Active workers for image-upload-queue: ${workers.length}`);
      if (workers.length === 0) {
        this.logger.warn('No active workers found! Jobs will not be processed.');
      }
      const counts = await this.queue.getJobCounts();
      this.logger.log(`Queue state: ${JSON.stringify(counts)}`);
    } catch (error) {
      this.logger.error('BullMQ health check failed', error);
    }
  }
}

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'image-upload-queue',
    }),
    PrismaModule,
    StorageModule,
    RedisModule,
    forwardRef(() => ProductImagesModule),
    MulterModule.register({
      storage: diskStorage({
        destination: TEMP_DIR,
        filename: (_req, file, cb) => {
          const ext = file.originalname.split('.').pop() ?? 'jpg';
          cb(null, `${uuidv4()}.${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10,
      },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [
    UploadController,
    TempUploadController,
    PromoteImagesController,
  ],
  providers: [
    ImageUploadProcessor,
    ImageUploadService,
    TempUploadService,
    PromoteImagesService,
    TempCleanupService,
    BullQueueHealthCheck,
  ],
  exports: [ImageUploadService, MulterModule, TempUploadService, PromoteImagesService],
})
export class ImageUploadModule {}
