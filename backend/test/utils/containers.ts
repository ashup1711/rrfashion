import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

export interface TestContainers {
  postgres: StartedPostgreSqlContainer;
  redis: StartedRedisContainer;
}

export async function startContainers(): Promise<TestContainers> {
  const postgres = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('rr_fashion_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  const redis = await new RedisContainer('redis:7-alpine').start();

  process.env.DATABASE_URL = postgres.getConnectionUri();
  process.env.REDIS_HOST = redis.getHost();
  process.env.REDIS_PORT = String(redis.getMappedPort(6379));

  return { postgres, redis };
}

export async function stopContainers(containers: TestContainers): Promise<void> {
  await Promise.all([containers.postgres.stop(), containers.redis.stop()]);
}
