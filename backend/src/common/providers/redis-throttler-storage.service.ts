import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../../redis/redis.service';

/**
 * Redis-backed ThrottlerStorage implementation for @nestjs/throttler.
 * Uses INCR + EXPIRE for a fixed-window rate limit strategy.
 * This enables distributed rate limiting across multiple Node.js instances/pods.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly client: ReturnType<RedisService['getClient']>;

  /** Required by ThrottlerStorage interface — not used when using custom increment(). */
  storage: Record<string, number[]> = {};

  constructor(private readonly redisService: RedisService) {
    this.client = this.redisService.getClient();
  }

  async increment(
    key: string,
    ttl: number,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
  }> {
    const redisKey = `throttler:${key}`;

    // Atomic increment — first call creates the key with TTL
    const count = await this.client.incr(redisKey);

    if (count === 1) {
      // First request in this window — set expiry in seconds
      await this.client.expire(redisKey, Math.ceil(ttl / 1000));
    }

    const ttlRemaining = await this.client.ttl(redisKey);
    const timeToExpire = ttlRemaining > 0 ? ttlRemaining * 1000 : ttl;

    return {
      totalHits: count,
      timeToExpire,
    };
  }
}
