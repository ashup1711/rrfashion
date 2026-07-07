import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RolesPermissionsService } from './roles-permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@ApiTags('Admin Roles')
@Controller('admin/roles')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesPermissionsService: RolesPermissionsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiCommonResponse({ summary: 'List all roles', isArray: true })
  async findAll() {
    return this.rolesPermissionsService.findAllRoles();
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiCommonResponse({ summary: 'Create a new role', status: 201 })
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesPermissionsService.createRole(dto);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiCommonResponse({ summary: 'Get role by ID' })
  async findOne(@Param('id') id: string) {
    return this.rolesPermissionsService.findRoleById(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiCommonResponse({ summary: 'Update role' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesPermissionsService.updateRole(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiCommonResponse({ summary: 'Delete role' })
  async remove(@Param('id') id: string) {
    await this.rolesPermissionsService.deleteRole(id);
    return { message: 'Role deleted successfully' };
  }

  @Post(':id/permissions')
  @Roles('SUPER_ADMIN')
  @ApiCommonResponse({ summary: 'Assign permissions to role' })
  async assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.rolesPermissionsService.assignPermissions(id, dto);
  }
}
