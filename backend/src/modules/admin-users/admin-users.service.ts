import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminUsersService {
  private readonly bcryptSaltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptSaltRounds = this.configService.get<number>('auth.bcryptSaltRounds', 12);
  }

  async findAll(params: { page?: number; limit?: number; roleId?: string; search?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (params.roleId) {
      where.roleId = params.roleId;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.adminUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          roleId: true,
          role: {
            select: { id: true, name: true },
          },
          storeIds: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.adminUser.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: {
          select: { id: true, name: true, description: true },
        },
        storeIds: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    return admin;
  }

  async create(dto: CreateAdminUserDto) {
    const existingAdmin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (existingAdmin) {
      throw new ConflictException('An admin user with this email already exists');
    }

    // Check if a regular user with this email exists
    const existingRegularUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingRegularUser) {
      // A regular user exists — check if they already have an admin record (double-check race)
      const existingAdminForUser = await this.prisma.adminUser.findUnique({
        where: { email: dto.email },
      });
      if (existingAdminForUser) {
        throw new ConflictException('This user is already an admin');
      }
    }

    const role = await this.prisma.roleModel.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new BadRequestException('Role not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);

    const admin = await this.prisma.adminUser.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        roleId: dto.roleId,
        storeIds: dto.storeIds ?? [],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return admin;
  }

  async toggleStatus(id: string, isActive: boolean): Promise<void> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    // When deactivating, ensure it's not the last Super Admin
    if (!isActive && admin.roleId) {
      const role = await this.prisma.roleModel.findUnique({
        where: { id: admin.roleId },
      });
      if (role?.isSystem) {
        const superAdminCount = await this.prisma.adminUser.count({
          where: {
            roleId: admin.roleId,
            isActive: true,
            deletedAt: null,
            id: { not: id },
          },
        });
        if (superAdminCount === 0) {
          throw new BadRequestException('Cannot deactivate the last Super Admin');
        }
      }
    }

    await this.prisma.adminUser.update({
      where: { id },
      data: { isActive },
    });
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    if (dto.email && dto.email !== admin.email) {
      const existing = await this.prisma.adminUser.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('An admin user with this email already exists');
      }
    }

    if (dto.roleId) {
      const role = await this.prisma.roleModel.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new BadRequestException('Role not found');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.roleId !== undefined) updateData.roleId = dto.roleId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.storeIds !== undefined) updateData.storeIds = dto.storeIds;
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);
    }

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: {
          select: { id: true, name: true },
        },
        storeIds: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async deactivate(id: string): Promise<void> {
    await this.toggleStatus(id, false);
  }
}
