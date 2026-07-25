import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GuestSessionService } from './guest-session.service';

/**
 * Scheduled cleanup service for expired guest sessions.
 * Runs daily at 3:00 AM to purge stale guest data.
 *
 * This complements the PostgreSQL function `cleanup_expired_guest_sessions()`
 * which can also be invoked directly via Prisma.$queryRaw for manual cleanup.
 *
 * Cron expression '0 3 * * *' = daily at 3:00 AM (off-peak hours)
 */
@Injectable()
export class GuestCleanupService {
  private readonly logger = new Logger(GuestCleanupService.name);

  constructor(private readonly guestSessionService: GuestSessionService) {}

  /**
   * Daily cleanup of all expired guest sessions.
   * The GuestSessionService.cleanupExpired() handles cascading deletes:
   * - GuestCartItem (CASCADE on delete)
   * - GuestWishlistItem (CASCADE on delete)
   * - GuestAddress (CASCADE on delete)
   * - Order (SET NULL on delete)
   * - Review (SET NULL on delete)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredSessions(): Promise<void> {
    this.logger.log('Starting scheduled cleanup of expired guest sessions...');

    try {
      const result = await this.guestSessionService.cleanupExpired(new Date());

      if (result.sessions > 0) {
        this.logger.log({
          message: 'Guest session cleanup completed',
          deletedSessions: result.sessions,
          deletedCartItems: result.cartItems,
          deletedWishlistItems: result.wishlistItems,
          deletedAddresses: result.addresses,
        });
      } else {
        this.logger.debug('No expired guest sessions found to clean up');
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired guest sessions', error);
    }
  }
}
