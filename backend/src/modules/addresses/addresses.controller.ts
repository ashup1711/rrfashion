import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GuestSessionId } from '../../common/decorators/guest-session-id.decorator';
import { AddressesService } from './addresses.service';
import { GuestAddressService } from '../guest/guest-address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateGuestAddressDto, UpdateGuestAddressDto } from '../guest/dto/guest-address.dto';

interface RequestUser {
  type?: string;
  sub?: string;
  id?: string;
  guestSessionId?: string;
}

@ApiTags('Addresses')
@Controller('addresses')
@UseGuards(StoreAuthGuard)
@AllowGuest(true)
export class AddressesController {
  constructor(
    private readonly addressesService: AddressesService,
    private readonly guestAddressService: GuestAddressService,
  ) {}

  private getSessionId(user: RequestUser | null, guestSessionId?: string): string {
    if (user?.guestSessionId) {
      return user.guestSessionId;
    }
    if (guestSessionId) {
      return guestSessionId;
    }
    throw new UnauthorizedException('Guest session ID is required');
  }

  @Get()
  @ApiOperation({ summary: 'List user addresses' })
  async findAll(
    @CurrentUser() user: RequestUser | null,
    @GuestSessionId() guestSessionId?: string,
  ) {
    if (user?.type === 'guest') {
      const gid = this.getSessionId(user, guestSessionId);
      return this.guestAddressService.findBySession(gid);
    }
    const uid = user?.sub || user?.id;
    return this.addressesService.findByUser(uid!);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create address' })
  async create(
    @CurrentUser() user: RequestUser | null,
    @Body() dto: CreateAddressDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    if (user?.type === 'guest') {
      const gid = this.getSessionId(user, guestSessionId);
      // Map CreateAddressDto fields to CreateGuestAddressDto fields
      const guestDto: CreateGuestAddressDto = {
        label: dto.label,
        fullName: dto.label,
        phone: dto.phone ?? '0000000000',
        addressLine1: dto.line1,
        addressLine2: dto.line2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.pincode,
        country: 'India',
        isDefault: dto.isDefault ?? false,
      };
      return this.guestAddressService.create(gid, guestDto);
    }
    const uid = user?.sub || user?.id;
    return this.addressesService.create(uid!, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update address' })
  async update(
    @CurrentUser() user: RequestUser | null,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    if (user?.type === 'guest') {
      const gid = this.getSessionId(user, guestSessionId);
      const guestDto: UpdateGuestAddressDto = {};
      if (dto.label !== undefined) guestDto.label = dto.label;
      if (dto.line1 !== undefined) guestDto.addressLine1 = dto.line1;
      if (dto.line2 !== undefined) guestDto.addressLine2 = dto.line2;
      if (dto.city !== undefined) guestDto.city = dto.city;
      if (dto.state !== undefined) guestDto.state = dto.state;
      if (dto.pincode !== undefined) guestDto.postalCode = dto.pincode;
      if (dto.phone !== undefined) guestDto.phone = dto.phone;
      if (dto.isDefault !== undefined) guestDto.isDefault = dto.isDefault;
      return this.guestAddressService.update(gid, id, guestDto);
    }
    const uid = user?.sub || user?.id;
    return this.addressesService.update(uid!, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete address' })
  async delete(
    @CurrentUser() user: RequestUser | null,
    @Param('id') id: string,
    @GuestSessionId() guestSessionId?: string,
  ) {
    if (user?.type === 'guest') {
      const gid = this.getSessionId(user, guestSessionId);
      return this.guestAddressService.delete(gid, id);
    }
    const uid = user?.sub || user?.id;
    return this.addressesService.delete(uid!, id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set address as default' })
  async setDefault(
    @CurrentUser() user: RequestUser | null,
    @Param('id') id: string,
    @GuestSessionId() guestSessionId?: string,
  ) {
    if (user?.type === 'guest') {
      const gid = this.getSessionId(user, guestSessionId);
      return this.guestAddressService.setDefault(gid, id);
    }
    const uid = user?.sub || user?.id;
    return this.addressesService.setDefault(uid!, id);
  }
}
