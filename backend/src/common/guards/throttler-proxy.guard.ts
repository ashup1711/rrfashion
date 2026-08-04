import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Proxy-aware ThrottlerGuard that uses a composite key:
 *   - Authenticated: userId (unique per user, not shared across ngrok/proxy)
 *   - Guest: guestSessionId
 *   - Anonymous: first IP from X-Forwarded-For or req.ip
 *
 * This prevents rate limiting from breaking when all traffic comes through
 * a single proxy IP (e.g. ngrok tunnel or Cloudflare).
 */
@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
  private readonly logger = new Logger(ThrottlerProxyGuard.name);

  protected async getTracker(req: Request): Promise<string> {
    // REQ-SEC-10: per-user tracking — authenticated requests key by userId,
    // guest requests key by guestSessionId. This prevents all ngrok users
    // from sharing one 120/min bucket.
    const user = (req as any).user;
    if (user?.sub) {
      const tracker = `user:${user.sub}`;
      this.logger.debug(`[RateLimit] ${req.method} ${req.url} — tracker: ${tracker}`);
      return tracker;
    }
    if (user?.guestSessionId) {
      const tracker = `guest:${user.guestSessionId}`;
      this.logger.debug(`[RateLimit] ${req.method} ${req.url} — tracker: ${tracker}`);
      return tracker;
    }

    // Fall back to IP-based tracking for unauthenticated requests
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      const tracker = `ip:${ips.trim()}`;
      this.logger.debug(`[RateLimit] ${req.method} ${req.url} — tracker: ${tracker}`);
      return tracker;
    }
    const tracker = `ip:${req.ip ?? 'unknown'}`;
    this.logger.debug(`[RateLimit] ${req.method} ${req.url} — tracker: ${tracker}`);
    return tracker;
  }
}
