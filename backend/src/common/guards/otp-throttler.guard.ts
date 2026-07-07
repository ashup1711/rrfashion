import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Method-level throttler guard for OTP endpoints.
 *
 * Combines the request phone number with the client IP so that rate limiting
 * is enforced per `phone:ip` combination rather than by IP alone.
 */
@Injectable()
export class OtpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const phone = (req.body?.phone as string | undefined) ?? 'unknown';
    const ip = this.extractClientIp(req);
    return `otp:${phone}:${ip}`;
  }

  private extractClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return req.ip ?? 'unknown';
  }
}
