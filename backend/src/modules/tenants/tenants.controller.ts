import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { AuthenticatedAdmin } from '../../common/strategies/admin-jwt.strategy';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { AddTenantMemberDto } from './dto/add-tenant-member.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';

@ApiTags('Admin Tenants')
@Controller('admin/tenants')
@UseGuards(AdminJwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiCommonResponse({ summary: 'List tenants the current admin belongs to' })
  list(@CurrentUser('id') adminId: string) {
    return this.tenantsService.listSummaries(adminId);
  }

  @Get('current')
  @ApiCommonResponse({ summary: 'Get the active tenant' })
  async current(@CurrentUser('id') adminId: string) {
    const membership = await this.tenantsService.resolveMembership(
      adminId,
      TenantContext.requireTenantId(),
    );
    return { ...membership.tenant, role: membership.role };
  }

  @Post()
  @ApiCommonResponse({ summary: 'Create a tenant; the creator becomes its owner' })
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateTenantDto) {
    return this.tenantsService.create(adminId, dto);
  }

  @Get('current/members')
  @ApiCommonResponse({ summary: 'List members of the active tenant' })
  listMembers() {
    return this.tenantsService.listMembers(TenantContext.requireTenantId());
  }

  @Post('current/members')
  @ApiCommonResponse({ summary: 'Add an existing admin user to the active tenant' })
  addMember(@CurrentUser('id') adminId: string, @Body() dto: AddTenantMemberDto) {
    return this.tenantsService.addMember(TenantContext.requireTenantId(), adminId, dto);
  }

  @Delete('current/members/:membershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCommonResponse({ summary: 'Revoke a membership in the active tenant' })
  revokeMember(
    @CurrentUser('id') adminId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ) {
    return this.tenantsService.revokeMember(TenantContext.requireTenantId(), adminId, membershipId);
  }

  @Patch(':id/status')
  @ApiCommonResponse({ summary: 'Change tenant lifecycle status' })
  updateStatus(
    @CurrentUser() admin: AuthenticatedAdmin,
    @Param('id', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.tenantsService.updateStatus(tenantId, admin, dto.status);
  }
}
