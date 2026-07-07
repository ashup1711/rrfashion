import { execSync } from 'child_process';
import { resolve } from 'path';

export function runMigrations(): void {
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! },
    stdio: 'pipe',
  });
}
