/**
 * REQ-BE-006 / REQ-BE-007: customer + admin return-request controllers.
 *
 * Mounted under /api/orders/:orderId/return (customer) and
 * /api/admin/returns/:id/{approve,reject} (admin). The customer route
 * reuses StoreAuthGuard for the user/owner scoping.
 */
import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GuestSessionId } from '../../common/decorators/guest-session-id.decorator';
import { ReturnsService } from './returns.service';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ApproveReturnDto, RejectReturnDto } from './dto/admin-return-action.dto';

@ApiTags('Returns')
@Controller()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  // REQ-BE-006: customer-facing return creation.
  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post('orders/:orderId/return')
  @ApiOperation({ summary: 'Initiate a per-item return request' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Return request created' })
  @ApiBadRequestResponse({ description: 'Order not in returnable state or item not in order' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Caller does not own this order' })
  async create(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string | null,
    @Body() dto: CreateReturnRequestDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.returnsService.create(orderId, userId ?? null, guestSessionId ?? null, dto);
  }
}

@ApiTags('Admin Returns')
@Controller('admin/returns')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'List return requests (paginated, optional status filter)' })
  @ApiBearerAuth()
  async list(@Body() body: { page?: number; limit?: number; status?: string } = {}) {
    // Accept body instead of query to keep the implementation simple
    // and consistent with the rest of the admin controllers.
    return this.returnsService.listAdmin({
      page: body.page,
      limit: body.limit,
      status: body.status as never,
    });
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a return request and queue partial refunds' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Return approved, refunds initiated' })
  @ApiNotFoundResponse({ description: 'Return request not found' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ApproveReturnDto,
  ) {
    return this.returnsService.approve(id, adminId, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a return request' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Return rejected' })
  @ApiNotFoundResponse({ description: 'Return request not found' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectReturnDto,
  ) {
    return this.returnsService.reject(id, adminId, dto);
  }
}
