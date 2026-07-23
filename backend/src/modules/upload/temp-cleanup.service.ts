import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { StorageService } from '../../storage/storage.service';
import { readdir, stat, unlink } from 'fs/promises';
import * as path from 'path';

@Injectable()
export class TempCleanupService {
  private readonly logger = new Logger(TempCleanupService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTempImages(): Promise<void> {
    this.logger.log('Starting cleanup of expired temporary uploads...');

    try {
      const client = this.redis.getClient();
      let cursor = '0';
      let deletedCount = 0;

      do {
        // Scan for temp upload keys
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          'temp:upload:*',
          'COUNT',
          '100',
        );
        cursor = nextCursor;

        for (const key of keys) {
          try {
            const metadataStr = await this.redis.get(key);
            if (!metadataStr) {
              continue;
            }

            const metadata = JSON.parse(metadataStr);
            const expiresAt = new Date(metadata.expiresAt);

            // Check if expired
            if (expiresAt <= new Date()) {
              // Delete from S3
              try {
                await this.storage.delete(metadata.storageKey);
                this.logger.debug(`Deleted expired temp file: ${metadata.storageKey}`);
              } catch (storageError) {
                this.logger.warn(
                  `Failed to delete expired temp file from storage: ${metadata.storageKey}`,
                  storageError,
                );
              }

              // Delete Redis key
              await this.redis.del(key);
              deletedCount++;
            }
          } catch (keyError) {
            this.logger.warn(`Failed to process temp upload key: ${key}`, keyError);
          }
        }
      } while (cursor !== '0');

      this.logger.log(`Cleanup completed. Deleted ${deletedCount} expired temp uploads.`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired temp uploads', error);
    }
  }

  @Cron('0 */2 * * *')
  async cleanupOrphanedTempFiles(): Promise<void> {
    const tempDir = './uploads/temp';
    try {
      const files = await readdir(tempDir);
      const now = Date.now();
      let cleaned = 0;
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const fileStat = await stat(filePath);
          if (now - fileStat.mtimeMs > 3600_000) {
            await unlink(filePath);
            cleaned++;
          }
        } catch {
          // skip
        }
      }
      if (cleaned > 0) {
        this.logger.log(`Cleaned ${cleaned} orphaned temp files`);
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup orphaned temp files', error);
    }
  }
}
