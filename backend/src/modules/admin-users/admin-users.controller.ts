import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto';

@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiCommonResponse({ summary: 'List admin users', pagination: true })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('roleId') roleId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminUsersService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      roleId,
      search,
    });
  }

  @Post()
  @ApiCommonResponse({ summary: 'Create admin user', status: 201 })
  async create(@Body() dto: CreateAdminUserDto) {
    return this.adminUsersService.create(dto);
  }

  @Get(':id')
  @ApiCommonResponse({ summary: 'Get admin user by ID' })
  async findOne(@Param('id') id: string) {
    return this.adminUsersService.findById(id);
  }

  @Patch(':id')
  @ApiCommonResponse({ summary: 'Update admin user' })
  async update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminUsersService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiCommonResponse({ summary: 'Activate or deactivate an admin user' })
  async toggleStatus(@Param('id') id: string, @Body() dto: UpdateAdminStatusDto) {
    await this.adminUsersService.toggleStatus(id, dto.isActive);
    return { message: `Admin user ${dto.isActive ? 'activated' : 'deactivated'} successfully` };
  }

  @Patch(':id/deactivate')
  @ApiCommonResponse({ summary: 'Deactivate admin user' })
  async remove(@Param('id') id: string) {
    await this.adminUsersService.deactivate(id);
    return { message: 'Admin user deactivated successfully' };
  }
}
