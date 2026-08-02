import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { StoreAuthGuard } from './store-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const jwtVerifyMock = jwt.verify as jest.Mock;

describe('StoreAuthGuard (REQ-SEC-007)', () => {
  let guard: StoreAuthGuard;
  let prisma: PrismaService;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'auth.jwtSecret') return 'rr-fashion-jwt-secret-dev';
      if (key === 'auth.jwtAdminSecret') return 'rr-fashion-admin-jwt-secret-dev';
      return fallback;
    }),
  };
  const mockPrisma = {
    guestSession: {
      findUnique: jest.fn(),
    },
  };

  const exec = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as import('@nestjs/common').ExecutionContext;

  beforeAll(() => {
    guard = new StoreAuthGuard(
      mockReflector as unknown as Reflector,
      mockConfigService as unknown as ConfigService,
      mockPrisma as unknown as PrismaService,
    );
    prisma = mockPrisma as unknown as PrismaService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockPrisma.guestSession.findUnique.mockReset();
  });

  it('allows anonymous requests when @AllowGuest(true) is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const request: Record<string, unknown> = { headers: {} };
    await expect(guard.canActivate(exec(request))).resolves.toBe(true);
    expect(request.user).toBeNull();
  });

  it('rejects requests without a token when @AllowGuest(false)', async () => {
    const request: Record<string, unknown> = { headers: {} };
    await expect(guard.canActivate(exec(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a guest token whose ver matches the DB tokenVersion', async () => {
    mockPrisma.guestSession.findUnique.mockResolvedValue({ tokenVersion: 2 });
    jwtVerifyMock.mockReturnValue({
      sub: 'sess-1',
      type: 'guest',
      guestSessionId: 'sess-1',
      ver: 2,
    });

    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer valid.guest.token' },
    };
    await expect(guard.canActivate(exec(request))).resolves.toBe(true);
    expect(prisma.guestSession.findUnique).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      select: { tokenVersion: true },
    });
    expect(request.user).toMatchObject({ type: 'guest', sub: 'sess-1' });
  });

  it('rejects a stale guest token whose ver no longer matches tokenVersion (rotation)', async () => {
    mockPrisma.guestSession.findUnique.mockResolvedValue({ tokenVersion: 3 });
    jwtVerifyMock.mockReturnValue({
      sub: 'sess-1',
      type: 'guest',
      guestSessionId: 'sess-1',
      ver: 1, // stale — session was rotated to 3
    });

    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer stale.guest.token' },
    };
    await expect(guard.canActivate(exec(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a guest token when no ver claim is present and tokenVersion is 0 (pre-rotation)', async () => {
    mockPrisma.guestSession.findUnique.mockResolvedValue({ tokenVersion: 0 });
    jwtVerifyMock.mockReturnValue({
      sub: 'sess-1',
      type: 'guest',
      guestSessionId: 'sess-1',
    });

    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer legacy.guest.token' },
    };
    await expect(guard.canActivate(exec(request))).resolves.toBe(true);
  });

  it('accepts a customer token without a DB read', async () => {
    jwtVerifyMock.mockReturnValue({
      sub: 'u-1',
      email: 'a@b.com',
      role: 'CUSTOMER',
      type: 'customer',
    });

    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer customer.token' },
    };
    await expect(guard.canActivate(exec(request))).resolves.toBe(true);
    expect(mockPrisma.guestSession.findUnique).not.toHaveBeenCalled();
    expect(request.user).toMatchObject({ type: 'customer' });
  });

  it('rejects an invalid token', async () => {
    jwtVerifyMock.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer invalid.token' },
    };
    await expect(guard.canActivate(exec(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
