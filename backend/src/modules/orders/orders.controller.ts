import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderHistoryQueryDto } from './dto/order-history-query.dto';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';
import { RepurchaseResponseDto } from './dto/repurchase-response.dto';
import { InitiateReturnDto } from './dto/initiate-return.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post()
  @ApiCommonResponse({
    summary: 'Create a new order from user cart',
    status: 201,
    type: CreateOrderDto,
    auth: true,
  })
  async create(@CurrentUser('id') userId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(userId, createOrderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiCommonResponse({
    summary: 'Get all orders',
    type: CreateOrderDto,
    isArray: true,
    pagination: true,
    auth: true,
  })
  async findAll() {
    return this.ordersService.findAll();
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get('my')
  @ApiCommonResponse({
    summary: 'Get my orders',
    type: CreateOrderDto,
    isArray: true,
    pagination: true,
  })
  async findMyOrders(@CurrentUser('id') userId: string, @Query() query: OrderHistoryQueryDto) {
    return this.ordersService.findMyOrders(userId, query);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get('my/:id')
  @ApiCommonResponse({ summary: 'Get my order by ID', type: CreateOrderDto })
  async findMyOrder(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.findMyOrder(userId, id);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post('my/:id/repurchase')
  @ApiCommonResponse({ summary: 'Repurchase items from past order', type: RepurchaseResponseDto })
  async repurchase(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.repurchaseOrder(userId, id);
  }

  @Public()
  @Post('guest')
  @ApiCommonResponse({
    summary: 'Place order as guest',
    status: 201,
    type: CreateOrderDto,
    auth: false,
  })
  async guestCheckout(@Body() dto: GuestCheckoutDto) {
    return this.ordersService.guestCheckout(dto);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get(':orderId/invoice')
  @ApiCommonResponse({ summary: 'Download invoice PDF for an order' })
  async downloadInvoice(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.ordersService.getInvoicePdf(orderId, userId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  // --- Returns & Exchanges ---

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post('my/:id/return')
  @ApiCommonResponse({ summary: 'Initiate return for a delivered order', type: InitiateReturnDto })
  async initiateReturn(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: InitiateReturnDto,
  ) {
    return this.ordersService.initiateReturn(userId, id, dto);
  }

  // --- Coupon Application ---

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post('apply-coupon')
  @ApiCommonResponse({ summary: 'Apply coupon to current order', type: ApplyCouponDto })
  async applyCoupon(@CurrentUser('id') userId: string, @Body() dto: ApplyCouponDto) {
    return this.ordersService.applyCoupon(userId, dto);
  }

  // --- Order Tracking ---

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get('my/:id/tracking')
  @ApiCommonResponse({ summary: 'Get tracking info for order' })
  async getTracking(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.getTracking(userId, id);
  }

  // --- Legacy endpoints (admin-only — keep JwtAuthGuard) ---

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiCommonResponse({ summary: 'Get order by ID', type: CreateOrderDto, auth: true })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiCommonResponse({ summary: 'Update order status', type: CreateOrderDto, auth: true })
  async update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }
}
