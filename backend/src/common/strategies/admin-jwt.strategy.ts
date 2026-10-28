import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { TenantRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { TenantsService } from '../../modules/tenants/tenants.service';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  roleId: string;
  type: 'admin';
  /** Active tenant at token issue time. */
  tid?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
  roleId: string;
  role: {
    id: string;
    name: string;
  };
  permissions: string[];
  storeIds: string[];
  tenantId: string;
  tenantRole: TenantRole;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenantsService: TenantsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Try admin cookie first (primary)
        (request: Request) => {
          return request?.cookies?.admin_access_token ?? null;
        },
        // 2. Fall back to Authorization header (backward compat)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: configService.get<string>(
        'auth.jwtAdminSecret',
        'rr-fashion-admin-jwt-secret-dev',
      ),
    });
  }

  async validate(req: Request, payload: AdminJwtPayload): Promise<AuthenticatedAdmin> {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid token type');
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        isActive: true,
        deletedAt: true,
        storeIds: true,
        role: {
          select: {
            id: true,
            name: true,
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    module: true,
                    action: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    if (!admin.isActive || admin.deletedAt) {
      throw new UnauthorizedException('Admin account is deactivated');
    }

    // The X-Tenant-Id header wins over the token's tenant; membership is re-checked on
    // every request so revocations and suspensions take effect immediately.
    const membership = await this.tenantsService.resolveActiveMembership(
      admin.id,
      TenantContext.store()?.requestedTenantId ?? payload.tid,
      req.method,
    );
    TenantContext.setTenantId(membership.tenantId);

    const permissions = admin.role.rolePermissions.map(
      (rp) => `${rp.permission.module}:${rp.permission.action}`,
    );

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      roleId: admin.roleId,
      role: {
        id: admin.role.id,
        name: admin.role.name,
      },
      permissions,
      storeIds: admin.storeIds,
      tenantId: membership.tenantId,
      tenantRole: membership.role,
    };
  }
}
