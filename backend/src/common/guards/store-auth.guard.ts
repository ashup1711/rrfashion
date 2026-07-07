import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { ALLOW_GUEST_KEY } from '../../config/constants';

/**
 * Unified guard that accepts customer JWTs, guest JWTs, and admin JWTs.
 *
 * - Customer tokens are signed with `auth.jwtSecret` (type = 'customer')
 * - Guest tokens are signed with `auth.jwtSecret` (type = 'guest')
 * - Admin tokens are signed with `auth.jwtAdminSecret`
 *
 * Usage:
 *   @UseGuards(StoreAuthGuard)
 *   @AllowGuest(true)   // allow unauthenticated guests (sets user to null)
 *
 *   @UseGuards(StoreAuthGuard)
 *   @AllowGuest(false)  // require authentication (default)
 */
@Injectable()
export class StoreAuthGuard implements CanActivate {
  private readonly logger = new Logger(StoreAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization as string | undefined;

    const allowGuest = this.reflector.getAllAndOverride<boolean>(ALLOW_GUEST_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!authHeader) {
      if (allowGuest) {
        request.user = null;
        return true;
      }
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');

    const customerSecret = this.configService.get<string>(
      'auth.jwtSecret',
      'rr-fashion-jwt-secret-dev',
    );

    const adminSecret = this.configService.get<string>(
      'auth.jwtAdminSecret',
      'rr-fashion-admin-jwt-secret-dev',
    );

    // 1. Try customer / guest JWT (same secret, differentiated by type claim)
    try {
      const payload = jwt.verify(token, customerSecret) as Record<string, unknown>;

      if (payload.type === 'guest') {
        request.user = {
          sub: payload.sub as string,
          type: 'guest',
          guestSessionId: payload.sub as string,
          ...payload,
        };
      } else {
        request.user = {
          sub: payload.sub as string,
          email: payload.email as string,
          role: payload.role as string,
          type: 'customer',
          ...payload,
        };
      }
      return true;
    } catch {
      // Not a customer/guest token — continue checking
    }

    // 2. Try admin JWT
    try {
      const payload = jwt.verify(token, adminSecret) as Record<string, unknown>;

      request.user = {
        sub: payload.sub as string,
        email: payload.email as string,
        type: 'admin',
        ...payload,
      };
      return true;
    } catch {
      // Not an admin token either
    }

    throw new UnauthorizedException('Invalid or expired token');
  }
}
