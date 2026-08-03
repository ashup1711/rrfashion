/**
 * REQ-BE-008: customer-facing refund list endpoint.
 */
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GuestSessionId } from '../../common/decorators/guest-session-id.decorator';
import { RefundsService } from './refunds.service';

@ApiTags('Refunds')
@Controller('orders/:orderId/refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get()
  @ApiOperation({ summary: 'List all refunds for an order' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Refunds for the order, oldest first' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Caller does not own this order' })
  async list(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string | null,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.refundsService.listForOrder(orderId, userId ?? null, guestSessionId ?? null);
  }
}
