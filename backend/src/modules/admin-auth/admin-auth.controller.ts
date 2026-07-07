import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRefreshDto } from './dto/admin-refresh.dto';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @ApiCommonResponse({ summary: 'Admin login', auth: false })
  async login(@Body() loginDto: AdminLoginDto) {
    return this.adminAuthService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @ApiCommonResponse({ summary: 'Admin refresh access token', auth: false })
  async refresh(@Body() refreshDto: AdminRefreshDto) {
    return this.adminAuthService.refresh(refreshDto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('me')
  @ApiCommonResponse({ summary: 'Get current admin profile' })
  async getMe(@CurrentUser('id') adminId: string) {
    return this.adminAuthService.getMe(adminId);
  }
}
