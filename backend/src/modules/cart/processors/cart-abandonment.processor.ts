import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { CartAbandonedEvent, CartAbandonedItemSummary } from '../events/cart-abandoned.event';

/** Stable BullMQ job name for the repeatable cart abandonment scan. */
export const CART_ABANDONMENT_JOB_NAME = 'cart-abandonment-scan';
/** BullMQ queue that hosts the cart abandonment scan job. */
export const CART_ABANDONMENT_QUEUE = 'cart-abandonment';

/** Age after which a cart/session is considered abandoned (24 hours). */
const ABANDONMENT_AGE_MS = 24 * 60 * 60 * 1000;
/** Default repeat cron (every 6 hours). Overridable via CART_ABANDONMENT_CRON. */
const DEFAULT_ABANDONMENT_CRON = '0 */6 * * *';

export interface CartAbandonmentJobData {
  /** Reserved for future per-shard scans; kept minimal for serialization. */
  trigger?: string;
}

export interface CartAbandonmentScanResult {
  userCartsMarked: number;
  guestCartsMarked: number;
  guestSessionsTracked: number;
  totalCartsMarked: number;
}

/**
 * REQ-BE-004: BullMQ repeatable job (cron "0 0,6,12,18 * * *" — every 6 hours —
 * by default) that scans the Cart and GuestSession tables for carts idle for
 * 24+ hours, sets Cart.abandonedAt = now, and emits a CartAbandonedEvent.
 *
 * The repeatable job is registered with a stable jobId so re-deployments and
 * multiple workers cannot register duplicate schedulers.
 */
@Injectable()
@Processor(CART_ABANDONMENT_QUEUE)
export class CartAbandonmentProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(CartAbandonmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
    @InjectQueue(CART_ABANDONMENT_QUEUE) private readonly queue: Queue<CartAbandonmentJobData>,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const cron = this.config.get<string>('env.cartAbandonmentCron', DEFAULT_ABANDONMENT_CRON);
    try {
      await this.queue.add(
        CART_ABANDONMENT_JOB_NAME,
        {},
        {
          // Stable jobId turns add() into an upsert of the scheduler template —
          // safe to call from every worker/instance on boot.
          repeat: { pattern: cron, jobId: CART_ABANDONMENT_JOB_NAME },
        },
      );
      this.logger.log({
        cron,
        job: CART_ABANDONMENT_JOB_NAME,
        action: 'cart.abandonment.scan.scheduled',
      });
    } catch (error) {
      this.logger.error('Failed to schedule cart abandonment scan', error);
    }
  }

  async process(_job: Job<CartAbandonmentJobData>): Promise<CartAbandonmentScanResult> {
    const result = await this.runAbandonmentScan();
    this.logger.log({ ...result, action: 'cart.abandonment.scan.complete' });
    return result;
  }

  /** Public wrapper so tests/controllers can trigger the scan on demand. */
  async runAbandonmentScan(): Promise<CartAbandonmentScanResult> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - ABANDONMENT_AGE_MS);

    const userCartsMarked = await this.markUserCartsAbandoned(cutoff, now);
    const guestCartsMarked = await this.markGuestCartsAbandoned(cutoff, now);
    const guestSessionsTracked = await this.trackAbandonedGuestSessions(cutoff, now);

    return {
      userCartsMarked,
      guestCartsMarked,
      guestSessionsTracked,
      totalCartsMarked: userCartsMarked + guestCartsMarked + guestSessionsTracked,
    };
  }

  private async markUserCartsAbandoned(cutoff: Date, now: Date): Promise<number> {
    const carts = await this.prisma.cart.findMany({
      where: {
        userId: { not: null },
        abandonedAt: null,
        updatedAt: { lt: cutoff },
        items: { some: {} },
      },
      include: {
        items: { select: { variantId: true, quantity: true, type: true } },
      },
    });

    let marked = 0;
    for (const cart of carts) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { abandonedAt: now },
      });
      this.emitAbandoned(cart.id, cart.userId, null, cart.items, now);
      marked++;
    }

    return marked;
  }

  private async markGuestCartsAbandoned(cutoff: Date, now: Date): Promise<number> {
    const carts = await this.prisma.cart.findMany({
      where: {
        guestSessionId: { not: null },
        userId: null,
        abandonedAt: null,
        updatedAt: { lt: cutoff },
      },
    });

    let marked = 0;
    for (const cart of carts) {
      if (!cart.guestSessionId) continue;

      const itemCount = await this.prisma.guestCartItem.count({
        where: { guestSessionId: cart.guestSessionId },
      });

      if (itemCount === 0) {
        // Stale tracking row (session already cleaned up) — nothing to abandon.
        continue;
      }

      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { abandonedAt: now },
      });
      this.emitAbandoned(cart.id, null, cart.guestSessionId, [], now);
      marked++;
    }

    return marked;
  }

  /**
   * Backstop: GuestSession rows with cart items that predate the tracking Cart
   * row (legacy sessions created before REQ-BE-003). Materialize a tracking
   * Cart row with abandonedAt set so recovery links and analytics still work.
   */
  private async trackAbandonedGuestSessions(cutoff: Date, now: Date): Promise<number> {
    const sessions = await this.prisma.guestSession.findMany({
      where: {
        lastActivityAt: { lt: cutoff },
        cartItems: { some: {} },
      },
      select: {
        id: true,
        cartItems: { select: { variantId: true, quantity: true, type: true } },
      },
    });

    let tracked = 0;
    for (const session of sessions) {
      const existingCart = await this.prisma.cart.findUnique({
        where: { guestSessionId: session.id },
        select: { id: true },
      });

      if (existingCart) {
        // Covered by markGuestCartsAbandoned — skip.
        continue;
      }

      await this.prisma.cart.create({
        data: { guestSessionId: session.id, abandonedAt: now },
      });
      this.emitAbandoned(session.id, null, session.id, session.cartItems, now);
      tracked++;
    }

    return tracked;
  }

  private emitAbandoned(
    cartId: string,
    userId: string | null,
    guestSessionId: string | null,
    items: Array<{ variantId: string | null; quantity: number; type: string }>,
    now: Date,
  ): void {
    const summary: CartAbandonedItemSummary[] = items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      type: item.type,
    }));

    this.eventEmitter.emit(
      CartAbandonedEvent.eventName,
      new CartAbandonedEvent({
        cartId,
        userId,
        guestSessionId,
        itemCount: summary.reduce((sum, item) => sum + item.quantity, 0),
        items: summary,
        abandonedAt: now,
      }),
    );
  }
}
