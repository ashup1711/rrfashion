import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Injectable()
export class RolesPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllRoles() {
    const roles = await this.prisma.roleModel.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, module: true, action: true, description: true },
            },
          },
        },
        _count: { select: { adminUsers: true } },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.adminUsers,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      createdAt: role.createdAt,
    }));
  }

  async findRoleById(id: string) {
    const role = await this.prisma.roleModel.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, module: true, action: true, description: true },
            },
          },
        },
        _count: { select: { adminUsers: true } },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.adminUsers,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      createdAt: role.createdAt,
    };
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.prisma.roleModel.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('A role with this name already exists');
    }

    const role = await this.prisma.roleModel.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        isSystem: false,
      },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, module: true, action: true, description: true },
            },
          },
        },
      },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => rp.permission),
    };
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.roleModel.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (dto.name) {
      const existing = await this.prisma.roleModel.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('A role with this name already exists');
      }
    }

    const updated = await this.prisma.roleModel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, module: true, action: true, description: true },
            },
          },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isSystem: updated.isSystem,
      permissions: updated.rolePermissions.map((rp) => rp.permission),
    };
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.prisma.roleModel.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    // Check if role has admin users
    const adminCount = await this.prisma.adminUser.count({
      where: { roleId: id, deletedAt: null },
    });

    if (adminCount > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}": ${adminCount} admin user(s) are assigned to it`,
      );
    }

    await this.prisma.roleModel.delete({ where: { id } });
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async assignPermissions(roleId: string, dto: AssignPermissionsDto) {
    const role = await this.prisma.roleModel.findUnique({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Verify all permission IDs exist
    const existingPermissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
    });

    if (existingPermissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Replace all permissions for this role
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      }),
    ]);

    // Return updated role
    return this.findRoleById(roleId);
  }
}
