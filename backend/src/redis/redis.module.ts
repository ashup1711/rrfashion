import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { redisConfig } from '../config/redis.config';
import { RedisService } from './redis.service';
import { RedisThrottlerStorage } from '../common/providers/redis-throttler-storage.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [RedisService, RedisThrottlerStorage],
  exports: [RedisService, RedisThrottlerStorage],
})
export class RedisModule {}
