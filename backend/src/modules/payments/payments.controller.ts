import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Check Razorpay payment gateway health' })
  @ApiResponse({
    status: 200,
    description: 'Payment gateway health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        provider: { type: 'string', example: 'razorpay' },
        mode: { type: 'string', enum: ['test', 'live'] },
        latency: { type: 'number', description: 'API latency in ms' },
        lastChecked: { type: 'string', format: 'date-time' },
      },
    },
  })
  async checkHealth() {
    return this.paymentsService.checkHealth();
  }

  @Public()
  @Post('create-order')
  @ApiOperation({ summary: 'Create a Razorpay order' })
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(dto);
  }

  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify payment signature' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-razorpay-event-id') eventId: string,
  ) {
    const rawBody = (req as { rawBody?: string }).rawBody ?? '';
    return this.paymentsService.processWebhook(signature, rawBody, eventId);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund a payment' })
  async refund(@Param('id') id: string, @Body() dto: RefundPaymentDto) {
    return this.paymentsService.refund(id, dto.amount);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payments for an order' })
  async getByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentsByOrder(orderId);
  }
}
