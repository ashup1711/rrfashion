import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Admin Orders')
@Controller('admin/orders')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders with filters' })
  @ApiCommonResponse({ summary: 'List all orders with filters' })
  async findAll(@Query() query: AdminOrderQueryDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail for admin' })
  @ApiCommonResponse({ summary: 'Get order detail for admin' })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get order status change logs' })
  @ApiCommonResponse({ summary: 'Get order status change logs' })
  async getStatusLogs(@Param('id') id: string) {
    return this.ordersService.getOrderStatusLogs(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiCommonResponse({ summary: 'Update order status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.ordersService.updateOrderStatus(id, dto, adminId);
  }
}
