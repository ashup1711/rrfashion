/**
 * REQ-BE-004: CartAbandonedEvent.
 *
 * Domain event published via NestJS EventEmitter2 when the cart abandonment
 * scan marks a cart (user-owned or guest-owned) as abandoned
 * (`Cart.abandonedAt = now`). Listeners (analytics, recovery-email flows)
 * subscribe via @OnEvent('cart.abandoned') and must treat the payload as
 * immutable.
 *
 * The event class is intentionally framework-agnostic — it imports no Prisma
 * enums or decorators so it can be safely serialized for cross-process
 * delivery if/when a worker is split out (REQ-ARCH-004).
 */

export interface CartAbandonedItemSummary {
  variantId: string | null;
  quantity: number;
  type: string;
}

export class CartAbandonedEvent {
  /** Stable event name for @OnEvent('cart.abandoned') subscriptions. */
  static readonly eventName = 'cart.abandoned' as const;

  readonly cartId: string;
  /** Customer userId for user-attached carts; null for guest carts. */
  readonly userId: string | null;
  /** Guest session id for guest carts; null for user-attached carts. */
  readonly guestSessionId: string | null;
  readonly itemCount: number;
  readonly items: ReadonlyArray<CartAbandonedItemSummary>;
  /** ISO timestamp the cart was marked abandoned. */
  readonly abandonedAt: string;

  constructor(payload: {
    cartId: string;
    userId: string | null;
    guestSessionId: string | null;
    itemCount: number;
    items: CartAbandonedItemSummary[];
    abandonedAt?: Date;
  }) {
    this.cartId = payload.cartId;
    this.userId = payload.userId;
    this.guestSessionId = payload.guestSessionId;
    this.itemCount = payload.itemCount;
    this.items = Object.freeze([...payload.items]);
    this.abandonedAt = (payload.abandonedAt ?? new Date()).toISOString();
  }
}
