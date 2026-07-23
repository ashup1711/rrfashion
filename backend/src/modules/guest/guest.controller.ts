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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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
  constructor(private readonly guestSessionService: GuestSessionService) {}

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
