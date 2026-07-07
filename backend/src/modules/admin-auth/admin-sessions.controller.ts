import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { AdminAuthService } from './admin-auth.service';

@ApiTags('Admin Sessions')
@Controller('admin/sessions')
@UseGuards(AdminJwtAuthGuard)
export class AdminSessionsController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Get()
  @ApiCommonResponse({ summary: 'List active admin sessions', isArray: true })
  async listSessions(@CurrentUser('id') adminId: string) {
    return this.adminAuthService.listSessions(adminId);
  }

  @Post('revoke-all')
  @ApiCommonResponse({ summary: 'Revoke all admin sessions' })
  async revokeAllSessions(@CurrentUser('id') adminId: string) {
    return this.adminAuthService.revokeAllSessions(adminId);
  }

  @Post(':id/revoke')
  @ApiCommonResponse({ summary: 'Revoke a specific admin session' })
  async revokeSession(@Param('id') sessionId: string, @CurrentUser('id') adminId: string) {
    return this.adminAuthService.revokeSession(sessionId, adminId);
  }
}
