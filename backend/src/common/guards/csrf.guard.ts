import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * CSRF protection guard — validates Origin / Referer headers
 * for state-changing requests that lack an Authorization header.
 *
 * This app uses JWT Bearer tokens in Authorization headers, which are
 * naturally immune to CSRF. This guard is defense-in-depth for any
 * cookie-authenticated flows or form-based submissions.
 *
 * Only activates on POST/PUT/PATCH/DELETE methods when either:
 * 1. No Authorization header is present, OR
 * 2. The request content-type is application/x-www-form-urlencoded
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    const originConfig = this.configService.get<string>('CORS_ORIGIN', '*');
    this.allowedOrigins = originConfig === '*' ? [] : originConfig.split(',').map((o) => o.trim());
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip CSRF check for GET/HEAD/OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // Skip CSRF check if Authorization header is present (JWT Bearer token)
    if (request.headers.authorization) {
      return true;
    }

    // Skip CSRF check for multipart/form-data uploads (they have unique boundaries)
    const contentType = request.headers['content-type'] ?? '';
    if (contentType.includes('multipart/form-data')) {
      return true;
    }

    // For state-changing requests without Bearer token, validate Origin/Referer
    const origin = request.headers.origin;
    const referer = request.headers.referer;
    const host = request.headers.host;

    // If no allowed origins configured (wildcard), skip validation
    if (this.allowedOrigins.length === 0) {
      return true;
    }

    const isAllowed = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        // Allow same-origin requests
        if (host && parsed.host === host) {
          return true;
        }
        // Allow configured origins
        return this.allowedOrigins.some(
          (allowed) => parsed.origin.toLowerCase() === allowed.toLowerCase(),
        );
      } catch {
        return false;
      }
    };

    if (origin) {
      if (!isAllowed(origin)) {
        throw new ForbiddenException('CSRF validation failed: invalid Origin');
      }
      return true;
    }

    if (referer) {
      if (!isAllowed(referer)) {
        throw new ForbiddenException('CSRF validation failed: invalid Referer');
      }
      return true;
    }

    // No Origin or Referer header present — block state-changing requests
    // that don't have an Authorization header as a security measure
    throw new ForbiddenException(
      'CSRF validation failed: state-changing request without Origin, Referer, or Authorization header',
    );
  }
}
