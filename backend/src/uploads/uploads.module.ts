import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsController } from './uploads.controller';

// REQ-BE-013 / REQ-BE-014: file-size limits are env-driven. The default
// matches the previous hard-coded 10MB cap; production deployments can
// tune via UPLOAD_MAX_FILE_SIZE_BYTES (per route) and
// UPLOAD_MAX_PROFILE_SIZE_BYTES (per profile-photo route).
const DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const DEFAULT_UPLOAD_MAX_PROFILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const rawFileSize = parseInt(
          config.get<string>('UPLOAD_MAX_FILE_SIZE_BYTES', '') ?? '',
          10,
        );
        const rawProfileSize = parseInt(
          config.get<string>('UPLOAD_MAX_PROFILE_SIZE_BYTES', '') ?? '',
          10,
        );
        const productLimit =
          Number.isFinite(rawFileSize) && rawFileSize > 0
            ? rawFileSize
            : DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES;
        const profileLimit =
          Number.isFinite(rawProfileSize) && rawProfileSize > 0
            ? rawProfileSize
            : DEFAULT_UPLOAD_MAX_PROFILE_SIZE_BYTES;
        // Use the larger of the two as the module-wide ceiling; per-route
        // ParseFilePipe validators still apply tighter caps.
        const globalLimit = Math.max(productLimit, profileLimit);
        return {
          storage: memoryStorage(),
          limits: {
            fileSize: globalLimit,
            files: 10,
          },
        };
      },
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
