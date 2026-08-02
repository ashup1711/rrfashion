import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard (SEC-04, REQ-SEC-012)', () => {
  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://rrfashion.com,https://admin.rrfashion.com'),
  };
  const mockReflector = {} as Reflector;

  const guard = new CsrfGuard(mockConfigService as unknown as ConfigService, mockReflector);

  const exec = (req: unknown) =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as import('@nestjs/common').ExecutionContext;

  it('passes state-changing requests that carry Authorization: Bearer', () => {
    const req = {
      method: 'POST',
      path: '/api/cart/add',
      headers: { authorization: 'Bearer x', 'content-type': 'application/json' },
    };
    expect(guard.canActivate(exec(req))).toBe(true);
  });

  it('passes same-origin cookie-only requests (valid Origin)', () => {
    const req = {
      method: 'POST',
      path: '/api/cart/merge',
      headers: {
        'content-type': 'application/json',
        origin: 'https://rrfashion.com',
        host: 'api.rrfashion.com',
      },
    };
    expect(guard.canActivate(exec(req))).toBe(true);
  });

  it('rejects cross-origin cookie-only POST', () => {
    const req = {
      method: 'POST',
      path: '/api/cart/merge',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example',
        host: 'api.rrfashion.com',
      },
    };
    expect(() => guard.canActivate(exec(req))).toThrow(ForbiddenException);
  });

  it('rejects state-changing cookie-only requests with no Origin/Referer', () => {
    const req = {
      method: 'POST',
      path: '/api/cart/merge',
      headers: { 'content-type': 'application/json' },
    };
    expect(() => guard.canActivate(exec(req))).toThrow(ForbiddenException);
  });

  it('skips multipart/form-data uploads', () => {
    const req = {
      method: 'POST',
      path: '/api/upload',
      headers: { 'content-type': 'multipart/form-data; boundary=----x' },
    };
    expect(guard.canActivate(exec(req))).toBe(true);
  });

  it('passes GET/HEAD/OPTIONS without checks', () => {
    const req = { method: 'GET', path: '/api/cart', headers: {} };
    expect(guard.canActivate(exec(req))).toBe(true);
  });
});
