import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Proxy-aware ThrottlerGuard that uses the first IP in the
 * X-Forwarded-For header (or the client IP) as the rate limit key.
 *
 * This prevents rate limiting from breaking when requests come through
 * reverse proxies (nginx, ALB, CloudFront, etc.).
 */
@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
  private readonly logger = new Logger(ThrottlerProxyGuard.name);

  protected async getTracker(req: Request): Promise<string> {
    // Use the first IP from X-Forwarded-For if available, otherwise fall back to req.ip
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      const tracker = ips.trim();
      this.logger.debug(`[RateLimit] ${req.method} ${req.url} — tracker: ${tracker}`);
      return tracker;
    }
    const tracker = req.ip ?? 'unknown';
    this.logger.debug(`[RateLimit] ${req.method} ${req.url} — tracker: ${tracker}`);
    return tracker;
  }
}
