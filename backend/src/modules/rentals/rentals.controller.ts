import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RentalsService } from './rentals.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { BookRentalDto } from './dto/book-rental.dto';
import { InspectRentalDto } from './dto/inspect-rental.dto';
import { ExtendRentalDto } from './dto/extend-rental.dto';
import { CreateDepositDto, CaptureDepositDto, ReleaseDepositDto } from './dto/create-deposit.dto';

@ApiTags('Rentals')
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Public()
  @Post('check-availability')
  @ApiOperation({ summary: 'Check rental availability for a variant' })
  async checkAvailability(@Body() dto: CheckAvailabilityDto) {
    return this.rentalsService.checkAvailability(dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
  @Post('book')
  @ApiOperation({ summary: 'Create a rental booking' })
  async book(@Body() dto: BookRentalDto) {
    return this.rentalsService.book(dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
  @Post(':id/pickup')
  @ApiOperation({ summary: 'Confirm rental pickup' })
  async confirmPickup(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.rentalsService.confirmPickup(id, adminId);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
  @Post(':id/return')
  @ApiOperation({ summary: 'Process rental return' })
  async processReturn(@Param('id') id: string) {
    return this.rentalsService.processReturn(id);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
  @Post(':id/inspect')
  @ApiOperation({ summary: 'Inspect returned rental (damage assessment)' })
  async inspect(
    @Param('id') id: string,
    @Body() dto: InspectRentalDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.rentalsService.inspect(id, dto, adminId);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
  @Post(':id/close')
  @ApiOperation({ summary: 'Close rental booking (finalize deposit)' })
  async close(@Param('id') id: string) {
    return this.rentalsService.close(id);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
  @Post(':id/extend')
  @ApiOperation({ summary: 'Extend rental period' })
  async extend(
    @Param('id') id: string,
    @Body() dto: ExtendRentalDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.rentalsService.extend(id, dto, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/create-deposit')
  @ApiOperation({ summary: 'Create Razorpay pre-auth hold for security deposit' })
  async createDeposit(@Param('id') id: string, @Body() dto: CreateDepositDto) {
    return this.rentalsService.createDeposit(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
  @Post(':id/capture-deposit')
  @ApiOperation({ summary: 'Capture (settle) security deposit after return inspection' })
  async captureDeposit(@Param('id') id: string, @Body() dto: CaptureDepositDto) {
    return this.rentalsService.captureDeposit(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
  @Post(':id/release-deposit')
  @ApiOperation({ summary: 'Release (void) security deposit pre-auth hold' })
  async releaseDeposit(@Param('id') id: string, @Body() dto: ReleaseDepositDto) {
    return this.rentalsService.releaseDeposit(id, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get rental booking by ID' })
  async getById(@Param('id') id: string) {
    return this.rentalsService.getById(id);
  }

  @Public()
  @Get('by-order-item/:orderItemId')
  @ApiOperation({ summary: 'Get rentals for an order item' })
  async findByOrderItem(@Param('orderItemId') orderItemId: string) {
    return this.rentalsService.findByOrderItem(orderItemId);
  }
}
