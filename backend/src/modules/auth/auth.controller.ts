import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OtpThrottlerGuard } from '../../common/guards/otp-throttler.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { MergeGuestDto } from './dto/merge-guest.dto';
import { GuestResponseDto } from './dto/guest.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiCommonResponse({ summary: 'User login', auth: false })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  @ApiCommonResponse({ summary: 'User registration', status: 201, auth: false })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('guest')
  @ApiCommonResponse({
    summary: 'Create guest user',
    status: 201,
    auth: false,
    type: GuestResponseDto,
  })
  async createGuest(): Promise<GuestResponseDto> {
    return this.authService.createGuestUser();
  }

  @Public()
  @Post('refresh')
  @ApiCommonResponse({ summary: 'Refresh access token', auth: false })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto);
  }

  @Public()
  @UseGuards(OtpThrottlerGuard)
  @SkipThrottle({ general: true, auth: true, upload: true, otp: true })
  @Throttle({ otp: { limit: 5, ttl: 300 } })
  @Post('send-otp')
  @ApiCommonResponse({ summary: 'Send OTP to phone', status: 201, auth: false })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @UseGuards(OtpThrottlerGuard)
  @SkipThrottle({ general: true, auth: true, upload: true, otp: true })
  @Throttle({ otp: { limit: 5, ttl: 300 } })
  @Post('verify-otp')
  @ApiCommonResponse({ summary: 'Verify OTP', auth: false })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @UseGuards(OtpThrottlerGuard)
  @SkipThrottle({ general: true, auth: true, upload: true, otp: true })
  @Throttle({ otp: { limit: 5, ttl: 300 } })
  @Post('resend-otp')
  @ApiCommonResponse({ summary: 'Resend OTP', auth: false })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiCommonResponse({ summary: 'Logout and invalidate refresh token' })
  async logout(@CurrentUser('id') userId: string, @Body() logoutDto: LogoutDto) {
    await this.authService.logout(userId, logoutDto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiCommonResponse({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('merge-guest-account')
  @ApiCommonResponse({ summary: 'Merge guest account into registered account' })
  async mergeGuestAccount(@CurrentUser('id') userId: string, @Body() mergeGuestDto: MergeGuestDto) {
    if (mergeGuestDto.guestSessionId) {
      const result = await this.authService.migrateGuestSessionToUser(
        mergeGuestDto.guestSessionId,
        userId,
      );
      return {
        message: 'Guest session merged successfully',
        mergedCartItems: result.cartItems,
        mergedWishlistItems: result.wishlistItems,
      };
    }
    if (mergeGuestDto.guestId) {
      const result = await this.authService.mergeGuestAccount(mergeGuestDto.guestId, userId);
      return {
        message: result.message,
        mergedOrders: result.mergedOrders,
        mergedCart: result.mergedCart,
        mergedWishlist: result.mergedWishlist,
      };
    }
    return { message: 'No guest identifier provided' };
  }
}
