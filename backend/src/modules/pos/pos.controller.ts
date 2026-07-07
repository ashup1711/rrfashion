import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PosAuthGuard } from './guards/pos-auth.guard';
import { PosService } from './pos.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { SyncMutationDto } from './dto/sync-mutation.dto';
import { PosOrderDto } from './dto/pos-order.dto';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { Request } from 'express';

@ApiTags('POS')
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('devices/register')
  @ApiOperation({ summary: 'Register a POS device (returns API key)' })
  async registerDevice(@Body() dto: RegisterDeviceDto, @Req() req: Request) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminId = (req.user as any)?.id || 'system';
    return this.posService.registerDevice(dto, adminId);
  }

  @UseGuards(PosAuthGuard)
  @Post('sync')
  @ApiOperation({ summary: 'Sync offline mutations from POS device' })
  async syncMutations(@Body() dto: SyncMutationDto, @Req() req: Request) {
    const deviceUuid = req.headers['x-pos-device-id'] as string;
    return this.posService.syncMutations(deviceUuid, dto);
  }

  @UseGuards(PosAuthGuard)
  @Post('orders')
  @ApiOperation({ summary: 'Create order from POS device' })
  async createOrder(@Body() dto: PosOrderDto, @Req() req: Request) {
    const deviceUuid = req.headers['x-pos-device-id'] as string;
    return this.posService.createOrder(deviceUuid, dto);
  }

  @UseGuards(PosAuthGuard)
  @Get('inventory')
  @ApiOperation({ summary: 'Get available inventory for a store' })
  async getInventory(@Query() query: GetInventoryDto) {
    return this.posService.getStoreInventory(query.storeId, query.search);
  }
}
