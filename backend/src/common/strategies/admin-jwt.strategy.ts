import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  roleId: string;
  type: 'admin';
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
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'auth.jwtAdminSecret',
        'rr-fashion-admin-jwt-secret-dev',
      ),
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AuthenticatedAdmin> {
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
    };
  }
}
