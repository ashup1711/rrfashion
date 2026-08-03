import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { GuestSessionId } from '../../common/decorators/guest-session-id.decorator';
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
import { CancelOrderDto } from './dto/cancel-order.dto';

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
  async create(
    @CurrentUser('id') userId: string | null,
    @Body() createOrderDto: CreateOrderDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.ordersService.create(userId, createOrderDto, guestSessionId);
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

  // FIX-2 (QA): "my" order routes require a verified identity — an anonymous
  // request (no customer JWT / no guest JWT) gets 401 from StoreAuthGuard.
  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get('my')
  @ApiCommonResponse({
    summary: 'Get my orders',
    type: CreateOrderDto,
    isArray: true,
    pagination: true,
  })
  async findMyOrders(
    @CurrentUser('id') userId: string | null,
    @Query() query: OrderHistoryQueryDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.ordersService.findMyOrders(userId, query, guestSessionId);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get('my/:id')
  @ApiCommonResponse({ summary: 'Get my order by ID', type: CreateOrderDto })
  async findMyOrder(
    @CurrentUser('id') userId: string | null,
    @Param('id') id: string,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.ordersService.findMyOrder(userId, id, guestSessionId);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post('my/:id/repurchase')
  @ApiCommonResponse({ summary: 'Repurchase items from past order', type: RepurchaseResponseDto })
  async repurchase(
    @CurrentUser('id') userId: string | null,
    @Param('id') id: string,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.ordersService.repurchaseOrder(userId, id, guestSessionId);
  }

  // REQ-BE-001: customer-facing cancellation.
  // - PENDING / CONFIRMED can be cancelled by the customer.
  // - Admin (role claim from token) gets PROCESSING override.
  // - Anything else (SHIPPED, DELIVERED, RETURNED, etc.) → 400.
  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order (customer or admin override)' })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Order cancelled',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string', example: 'CANCELLED' },
            refundId: { type: 'string', nullable: true },
            cancelledAt: { type: 'string', format: 'date-time' },
            orderNumber: { type: 'string' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Order cannot be cancelled in its current status' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Caller does not own this order' })
  async cancel(
    @CurrentUser('id') userId: string | null,
    @CurrentUser() currentUser: Record<string, unknown> | null,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.type === 'admin';
    return this.ordersService.cancel(id, dto, userId ?? null, guestSessionId ?? null, !!isAdmin);
  }

  /**
   * @deprecated Use POST /orders with a guest session token instead.
   * This legacy endpoint will be removed in a future release.
   */
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
    @CurrentUser('id') userId: string | null,
    @Param('orderId') orderId: string,
    @Res() res: Response,
    @GuestSessionId() guestSessionId?: string,
  ) {
    const { buffer, filename } = await this.ordersService.getInvoicePdf(
      orderId,
      userId,
      guestSessionId,
    );
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
    @CurrentUser('id') userId: string | null,
    @Param('id') id: string,
    @Body() dto: InitiateReturnDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.ordersService.initiateReturn(userId, id, dto, guestSessionId);
  }

  // --- Coupon Application ---

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post('apply-coupon')
  @ApiCommonResponse({ summary: 'Apply coupon to current order', type: ApplyCouponDto })
  async applyCoupon(
    @CurrentUser('id') userId: string | null,
    @Body() dto: ApplyCouponDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.ordersService.applyCoupon(userId, dto, guestSessionId);
  }

  // --- Order Tracking ---

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get('my/:id/tracking')
  @ApiCommonResponse({ summary: 'Get tracking info for order' })
  async getTracking(
    @CurrentUser('id') userId: string | null,
    @Param('id') id: string,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.ordersService.getTracking(userId, id, guestSessionId);
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
