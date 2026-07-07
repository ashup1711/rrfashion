import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RolesPermissionsService } from './roles-permissions.service';

@ApiTags('Admin Permissions')
@Controller('admin/permissions')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class PermissionsController {
  constructor(private readonly rolesPermissionsService: RolesPermissionsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiCommonResponse({ summary: 'List all permissions', isArray: true })
  async findAll() {
    return this.rolesPermissionsService.findAllPermissions();
  }
}
