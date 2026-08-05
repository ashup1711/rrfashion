import { Controller, Get, Post, Param, Body, UseGuards, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GuestSessionId } from '../../common/decorators/guest-session-id.decorator';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InvoicesService } from './invoices.service';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { CreateCreditNoteDto } from './dto/credit-note.dto';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('generate')
  @ApiOperation({ summary: 'Generate GST invoice for an order' })
  async generate(@Body() dto: GenerateInvoiceDto) {
    return this.invoicesService.generate(dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('credit-note')
  @ApiOperation({ summary: 'Create credit note for returns/cancellations' })
  async createCreditNote(@Body() dto: CreateCreditNoteDto) {
    return this.invoicesService.createCreditNote(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiCommonResponse({ summary: 'Get invoice by ID', auth: true })
  async getById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.invoicesService.getById(id, userId);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get invoice data for an order (customer or guest)' })
  @ApiCommonResponse({ summary: 'Get invoice data for an order', auth: true })
  async getByOrder(
    @CurrentUser('id') userId: string | null,
    @Param('orderId') orderId: string,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.invoicesService.getByOrder(orderId, userId ?? undefined, guestSessionId);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get('order/:orderId/data')
  @ApiOperation({ summary: 'Get full invoice data for display (customer or guest)' })
  @ApiCommonResponse({ summary: 'Get full invoice data for display', auth: true })
  async getInvoiceData(
    @CurrentUser('id') userId: string | null,
    @Param('orderId') orderId: string,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.invoicesService.getInvoiceData(orderId, userId ?? undefined, guestSessionId);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Get('order/:orderId/download')
  @ApiCommonResponse({ summary: 'Download invoice PDF for an order' })
  async downloadInvoice(
    @CurrentUser('id') userId: string | null,
    @Param('orderId') orderId: string,
    @GuestSessionId() guestSessionId?: string,
    @Res() res?: Response,
  ) {
    const { buffer, filename } = await this.invoicesService.getPdfForOrder(
      orderId,
      userId ?? undefined,
      guestSessionId,
    );
    res!.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res!.send(buffer);
  }
}
