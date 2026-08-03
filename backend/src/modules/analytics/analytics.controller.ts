import { Controller, Get, Post, Body, Query, UseGuards, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { TopProductsQueryDto } from './dto/top-products-query.dto';
import { ExportQueryDto } from './dto/export-query.dto';

@ApiTags('Analytics')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
/**
 * SEC-14: every route below carries `Cache-Control: no-store` — admin insights and
 * export responses are authenticated and commercially sensitive, so no browser or
 * shared/proxy cache may store them. The global `noStoreMiddleware` allow-list only
 * covers /api/cart|wishlist|auth|orders|profile|guest, so /api/admin/analytics/*
 * sets the header explicitly per handler (`@Header` is a method-only decorator).
 */
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    @InjectQueue('report-export') private exportQueue: Queue,
  ) {}

  @Get('dashboard')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Dashboard aggregation (revenue, orders, growth)' })
  async dashboard(@Query() query: DashboardQueryDto) {
    return this.analyticsService.dashboard(query.view || 'month');
  }

  @Get('revenue-chart')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Revenue trend over time' })
  async revenueChart(@Query() query: DashboardQueryDto) {
    return this.analyticsService.revenueChart(query.view || 'month');
  }

  @Get('top-products')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Top-selling products by revenue/units' })
  async topProducts(@Query() query: TopProductsQueryDto) {
    let startDate: Date;
    let endDate: Date;

    if (query.view) {
      const dateRange = this.analyticsService.getDateRange(query.view);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    } else {
      const now = new Date();
      startDate = query.startDate
        ? new Date(query.startDate)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = query.endDate ? new Date(query.endDate) : now;
    }

    return this.analyticsService.topProducts(startDate, endDate, query.limit || 10, {
      categoryId: query.categoryId,
      brandId: query.brandId,
      channel: query.channel,
    });
  }

  @Post('export')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Request async report export (PDF/Excel)' })
  async export(@Body() dto: ExportQueryDto, @CurrentUser('id') adminId: string) {
    const report = await this.analyticsService.createReport(
      adminId,
      dto.reportType,
      dto.format,
      dto.parameters || {},
    );

    await this.exportQueue.add('export', {
      reportId: report.id,
      reportType: dto.reportType,
      format: dto.format,
      parameters: dto.parameters || {},
    });

    return {
      reportId: report.id,
      status: 'PROCESSING',
      message: 'Export queued. Check back for completion.',
    };
  }
}
