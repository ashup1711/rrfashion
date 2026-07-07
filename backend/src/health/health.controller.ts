import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  async check() {
    const dbOk = await this.prisma.$queryRaw`SELECT 1`.catch(() => false);
    const redisOk = await this.redis
      .getClient()
      .ping()
      .catch(() => false);

    const status = dbOk && redisOk ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
      },
    };
  }

  @Get('ready')
  async ready() {
    const dbOk = await this.prisma.$queryRaw`SELECT 1`.catch(() => false);
    return { status: dbOk ? 'ok' : 'down' };
  }
}
