import { Controller, Post, Get, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
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
  async login(@Body() loginDto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.adminAuthService.login(loginDto);
    this.setAdminAuthCookies(res, result.accessToken, result.refreshToken);
    return { admin: result.admin };
  }

  @Public()
  @Post('refresh')
  @ApiCommonResponse({ summary: 'Admin refresh access token', auth: false })
  async refresh(@Body() refreshDto: AdminRefreshDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.adminAuthService.refresh(refreshDto);
    this.setAdminAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Token refreshed' };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('logout')
  @ApiCommonResponse({ summary: 'Admin logout' })
  async logout(@CurrentUser('id') adminId: string, @Res({ passthrough: true }) res: Response) {
    // Revoke all admin sessions server-side before clearing cookies (SEC-01)
    await this.adminAuthService.revokeAllSessions(adminId);

    // Clear admin cookies
    res.clearCookie('admin_access_token', { path: '/' });
    res.clearCookie('admin_refresh_token', { path: '/api/admin/auth' });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('me')
  @ApiCommonResponse({ summary: 'Get current admin profile' })
  async getMe(@CurrentUser('id') adminId: string) {
    return this.adminAuthService.getMe(adminId);
  }

  private setAdminAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    // SameSite=None required for cross-origin (GitHub Pages → ngrok)
    // Can be overridden via COOKIE_SAMESITE env var (none/strict/lax)
    const sameSite = (process.env.COOKIE_SAMESITE ||
      (process.env.NODE_ENV === 'production' ? 'none' : 'strict')) as 'none' | 'strict' | 'lax';
    // Secure is REQUIRED when SameSite=None (browser spec)
    const isSecure = sameSite === 'none' || process.env.NODE_ENV === 'production';
    res.cookie('admin_access_token', accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite,
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite,
      path: '/api/admin/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
