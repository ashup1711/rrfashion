import { Request, Response, NextFunction } from 'express';

/**
 * REQ-SEC-010 / SEC-14: `Cache-Control: no-store` on authenticated / user-specific
 * routes so shared or proxy caches can never serve one user's cart/wishlist,
 * auth session, orders, or guest data to another user. Public catalog routes
 * (e.g. /api/products) remain cacheable.
 */
const USER_SCOPED_PREFIXES = [
  '/api/cart',
  '/api/wishlist',
  '/api/auth',
  '/api/orders',
  '/api/profile',
  '/api/guest',
] as const;

export const USER_SCOPED_PREFIXES_LIST: readonly string[] = USER_SCOPED_PREFIXES;

export function noStoreMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (USER_SCOPED_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}
