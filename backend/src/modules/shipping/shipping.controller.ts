import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ShippingService } from './shipping.service';
import { AddAddressDto } from './dto/add-address.dto';
import { AddCourierDto } from './dto/add-courier.dto';
import { CheckPincodeDto } from './dto/check-pincode.dto';

@ApiTags('Shipping')
@Controller()
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('orders/:orderId/shipping-address')
  @ApiOperation({ summary: 'Add shipping address to an order' })
  async addAddress(@Param('orderId') orderId: string, @Body() dto: AddAddressDto) {
    return this.shippingService.addAddress(orderId, dto);
  }

  @Get('orders/:orderId/shipping-address')
  @ApiOperation({ summary: 'Get shipping addresses for an order' })
  async getAddress(@Param('orderId') orderId: string) {
    return this.shippingService.getAddress(orderId);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
  @Post('orders/:orderId/courier')
  @ApiOperation({ summary: 'Add courier receipt to an order' })
  async addCourier(
    @Param('orderId') orderId: string,
    @Body() dto: AddCourierDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.shippingService.addCourier(orderId, adminId, dto);
  }

  @Get('orders/:orderId/courier')
  @ApiOperation({ summary: 'Get courier receipts for an order' })
  async getCourierReceipts(@Param('orderId') orderId: string) {
    return this.shippingService.getCourierReceipts(orderId);
  }

  @Public()
  @Post('shipping/check-pincode')
  @ApiOperation({ summary: 'Check pincode serviceability' })
  async checkPincode(@Body() dto: CheckPincodeDto) {
    return this.shippingService.checkPincode(dto);
  }
}
