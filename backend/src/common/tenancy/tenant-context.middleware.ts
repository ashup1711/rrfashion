import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { isUUID } from 'class-validator';
import { TenantsService } from '../../modules/tenants/tenants.service';
import { TenantContext } from './tenant-context';
import { DEFAULT_TENANT_ID, TENANT_HEADER } from './tenant.constants';

/**
 * Establishes the request-scoped tenant context. The X-Tenant-Id header selects the
 * tenant; requests without it (storefront, legacy clients) use the default tenant.
 * Admin requests are further narrowed by AdminJwtStrategy, which verifies membership.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly defaultTenantId: string;

  constructor(
    private readonly tenantsService: TenantsService,
    configService: ConfigService,
  ) {
    this.defaultTenantId = configService.get<string>('DEFAULT_TENANT_ID') || DEFAULT_TENANT_ID;
  }

  async use(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers[TENANT_HEADER];
    const requestedTenantId = (Array.isArray(header) ? header[0] : header)?.trim() || undefined;

    if (requestedTenantId) {
      if (!isUUID(requestedTenantId)) {
        throw new BadRequestException('Invalid X-Tenant-Id header');
      }
      await this.tenantsService.getAccessibleTenant(requestedTenantId, req.method);
    }

    TenantContext.run(
      { tenantId: requestedTenantId ?? this.defaultTenantId, requestedTenantId },
      () => next(),
    );
  }
}
