import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { GuestSessionId } from '../../common/decorators/guest-session-id.decorator';
import { GuestSessionService } from './guest-session.service';
import { GuestStartResponseDto } from './dto/guest-start-response.dto';
import {
  CreateGuestAddressDto,
  UpdateGuestAddressDto,
  GuestAddressResponseDto,
} from './dto/guest-address.dto';

@ApiTags('Guest')
@Controller('guest')
export class GuestController {
  constructor(
    private readonly guestSessionService: GuestSessionService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('start')
  @ApiCommonResponse({
    summary: 'Start a guest session — returns JWT token for store API auth',
    status: 201,
    auth: false,
    type: GuestStartResponseDto,
  })
  async startGuest(): Promise<GuestStartResponseDto> {
    return this.guestSessionService.createWithToken();
  }

  /**
   * REQ-BE-016: Refresh an expiring guest session.
   * Accepts the current guest token and returns a new token with extended expiry.
   */
  @Public()
  @Post('refresh')
  @ApiCommonResponse({
    summary: 'Refresh an expiring guest session',
    status: 201,
    auth: false,
    type: GuestStartResponseDto,
  })
  async refreshSession(
    @Headers('authorization') authHeader?: string,
  ): Promise<GuestStartResponseDto> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Guest token required');
    }
    const token = authHeader.slice(7);
    try {
      // Decode the current token to get session ID
      const decoded = this.jwtService.verify(token) as { guestSessionId: string; type: string };
      if (decoded.type !== 'guest') {
        throw new UnauthorizedException('Invalid guest token');
      }
      return this.guestSessionService.refreshSession(decoded.guestSessionId);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired guest token');
    }
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Get('addresses')
  @ApiOperation({ summary: 'List guest addresses' })
  async getAddresses(@GuestSessionId() guestSessionId: string): Promise<GuestAddressResponseDto[]> {
    return this.guestSessionService.getAddresses(guestSessionId);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Post('addresses')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create guest address' })
  async createAddress(
    @GuestSessionId() guestSessionId: string,
    @Body() dto: CreateGuestAddressDto,
  ): Promise<GuestAddressResponseDto> {
    return this.guestSessionService.createAddress(guestSessionId, dto);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update guest address' })
  async updateAddress(
    @GuestSessionId() guestSessionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGuestAddressDto,
  ): Promise<GuestAddressResponseDto> {
    return this.guestSessionService.updateAddress(guestSessionId, id, dto);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete guest address' })
  async deleteAddress(
    @GuestSessionId() guestSessionId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.guestSessionService.deleteAddress(guestSessionId, id);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Patch('addresses/:id/default')
  @ApiOperation({ summary: 'Set guest address as default' })
  async setDefaultAddress(
    @GuestSessionId() guestSessionId: string,
    @Param('id') id: string,
  ): Promise<GuestAddressResponseDto> {
    return this.guestSessionService.setDefaultAddress(guestSessionId, id);
  }
}
