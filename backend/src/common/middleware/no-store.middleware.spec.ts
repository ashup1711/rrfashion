import { Request, Response, NextFunction } from 'express';
import { noStoreMiddleware } from './no-store.middleware';

describe('noStoreMiddleware (REQ-SEC-010 / SEC-14)', () => {
  const run = (path: string): string | null => {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    } as unknown as Response;
    const req = { path } as Request;
    const next = jest.fn() as NextFunction;

    noStoreMiddleware(req, res, next);
    return headers['Cache-Control'] ?? null;
  };

  it('sets Cache-Control: no-store for /api/cart', () => {
    expect(run('/api/cart')).toBe('no-store');
  });

  it('sets Cache-Control: no-store for /api/wishlist', () => {
    expect(run('/api/wishlist')).toBe('no-store');
  });

  it('sets Cache-Control: no-store for /api/auth sub-routes', () => {
    expect(run('/api/auth/me')).toBe('no-store');
  });

  it('sets Cache-Control: no-store for /api/guest sub-routes', () => {
    expect(run('/api/guest/refresh')).toBe('no-store');
  });

  it('sets Cache-Control: no-store for /api/orders', () => {
    expect(run('/api/orders')).toBe('no-store');
  });

  it('sets Cache-Control: no-store for /api/profile', () => {
    expect(run('/api/profile')).toBe('no-store');
  });

  it('does not set Cache-Control: no-store for public catalog routes', () => {
    expect(run('/api/products')).toBeNull();
  });

  it('does not set Cache-Control: no-store for health/metrics', () => {
    expect(run('/api/health')).toBeNull();
    expect(run('/api/metrics')).toBeNull();
  });
});
