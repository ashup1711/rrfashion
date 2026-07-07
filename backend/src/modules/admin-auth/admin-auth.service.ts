import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRefreshDto } from './dto/admin-refresh.dto';

export interface AdminAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AdminAuthResponse {
  admin: {
    id: string;
    name: string;
    email: string;
    role: {
      id: string;
      name: string;
    };
    permissions: string[];
    storeIds: string[];
  };
  accessToken: string;
  refreshToken: string;
}

export interface AdminMeResponse {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
    permissions: { module: string; action: string }[];
  };
  storeIds: string[];
  isActive: boolean;
}

@Injectable()
export class AdminAuthService {
  private readonly jwtAdminSecret: string;
  private readonly jwtAdminExpiresIn: string;
  private readonly refreshExpiresInMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtAdminSecret = this.configService.get<string>(
      'auth.jwtAdminSecret',
      'rr-fashion-admin-jwt-secret-dev',
    );
    this.jwtAdminExpiresIn = this.configService.get<string>('auth.jwtAdminExpiresIn', '15m');
    this.refreshExpiresInMs = this.configService.get<number>(
      'auth.refreshExpiresInMs',
      7 * 24 * 60 * 60 * 1000,
    );
  }

  async login(dto: AdminLoginDto): Promise<AdminAuthResponse> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            rolePermissions: {
              select: {
                permission: {
                  select: { module: true, action: true },
                },
              },
            },
          },
        },
      },
    });

    if (!admin || !admin.isActive || admin.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update lastLoginAt
    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const permissions = admin.role.rolePermissions.map(
      (rp) => `${rp.permission.module}:${rp.permission.action}`,
    );

    const tokens = await this.generateTokens(admin.id, admin.email, admin.role.id);

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: { id: admin.role.id, name: admin.role.name },
        permissions,
        storeIds: admin.storeIds,
      },
      ...tokens,
    };
  }

  async refresh(dto: AdminRefreshDto): Promise<AdminAuthTokens> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
    });

    if (!storedToken || storedToken.isRevoked) {
      if (storedToken?.isRevoked && storedToken.adminUserId) {
        await this.prisma.refreshToken.updateMany({
          where: { adminUserId: storedToken.adminUserId, isRevoked: false },
          data: { isRevoked: true },
        });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (new Date() > storedToken.expiresAt) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const adminId = storedToken.adminUserId!;
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, roleId: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    return this.generateTokens(admin.id, admin.email, admin.roleId);
  }

  async getMe(adminId: string): Promise<AdminMeResponse> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        storeIds: true,
        role: {
          select: {
            id: true,
            name: true,
            rolePermissions: {
              select: {
                permission: {
                  select: { module: true, action: true },
                },
              },
            },
          },
        },
      },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Admin not found');
    }

    const permissions = admin.role.rolePermissions.map((rp) => ({
      module: rp.permission.module,
      action: rp.permission.action,
    }));

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: {
        id: admin.role.id,
        name: admin.role.name,
        permissions,
      },
      storeIds: admin.storeIds,
      isActive: admin.isActive,
    };
  }

  async listSessions(adminId: string): Promise<
    Array<{
      id: string;
      createdAt: Date;
      expiresAt: Date;
      userAgent?: string;
    }>
  > {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        adminUserId: adminId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        userAgent: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      userAgent: s.userAgent ?? undefined,
    }));
  }

  async revokeAllSessions(adminId: string): Promise<{ message: string; count: number }> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        adminUserId: adminId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    return {
      message: 'All sessions revoked',
      count: result.count,
    };
  }

  async revokeSession(sessionId: string, adminId: string): Promise<{ message: string }> {
    const session = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.adminUserId !== adminId) {
      throw new UnauthorizedException('This session does not belong to the current admin');
    }

    if (session.isRevoked) {
      throw new NotFoundException('Session already revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    return { message: 'Session revoked' };
  }

  private async generateTokens(
    adminId: string,
    email: string,
    roleId: string,
  ): Promise<AdminAuthTokens> {
    const payload = {
      sub: adminId,
      email,
      roleId,
      type: 'admin' as const,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtAdminSecret,
      expiresIn: this.jwtAdminExpiresIn,
    });

    const rawRefreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + this.refreshExpiresInMs);

    await this.prisma.refreshToken.create({
      data: {
        token: rawRefreshToken,
        adminUserId: adminId,
        isRevoked: false,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }
}
