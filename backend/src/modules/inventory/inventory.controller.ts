import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InventoryService } from './inventory.service';
import { CreateLockDto } from './dto/create-lock.dto';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Admin Inventory')
@Controller('admin/inventory')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiCommonResponse({ summary: 'Get inventory summary', pagination: true })
  async getSummary(
    @Query('storeId') storeId?: string,
    @Query('variantId') variantId?: string,
    @Query('variantIds') variantIds?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getSummary({
      storeId,
      variantId,
      variantIds: variantIds ? variantIds.split(',') : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('variants/:id')
  @ApiCommonResponse({ summary: 'Get variant stock detail' })
  async getVariantDetail(@Param('id') id: string) {
    return this.inventoryService.getVariantDetail(id);
  }

  @Post('locks')
  @ApiCommonResponse({ summary: 'Create inventory lock', status: 201 })
  async createLock(@Body() dto: CreateLockDto, @CurrentUser('id') adminId: string) {
    const clientUuid = uuidv4();
    return this.inventoryService.createLock(dto, adminId, clientUuid);
  }

  @Delete('locks/:id')
  @ApiCommonResponse({ summary: 'Release inventory lock' })
  async releaseLock(@Param('id') id: string) {
    await this.inventoryService.releaseLock(id);
    return { message: 'Lock released successfully' };
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movements with pagination and filters' })
  async getMovements(
    @Query('variantId') variantId?: string,
    @Query('storeId') storeId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getMovements({
      variantId,
      storeId,
      type,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock items where quantity <= threshold' })
  async getLowStock(@Query('storeId') storeId?: string) {
    return this.inventoryService.getLowStockItems(storeId);
  }

  @Patch('adjust-stock')
  @ApiOperation({ summary: 'Manually adjust stock quantity for a variant at a store' })
  async adjustStock(
    @Body()
    body: {
      variantId: string;
      storeId: string;
      quantityChange: number;
      type: string;
      notes?: string;
    },
    @CurrentUser('id') adminId: string,
  ) {
    return this.inventoryService.adjustStock(
      body.variantId,
      body.storeId,
      body.quantityChange,
      body.type,
      body.notes,
      adminId,
    );
  }

  @Get('audit')
  @ApiCommonResponse({ summary: 'Get inventory audit logs', pagination: true })
  async getAuditLogs(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getAuditLogs({
      entity,
      entityId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
