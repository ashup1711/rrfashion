import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiUnauthorizedResponse, ApiOkResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';

@ApiTags('Metrics')
@Controller('metrics')
@UseGuards(AdminJwtAuthGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  // REQ-SEC-009 / SEC-13: /api/metrics is admin-only (Prometheus scrapes with
  // an admin token or internal proxy). Removed @Public() so the guard cannot be
  // bypassed; the route is also excluded from throttling in app.module.ts.
  @Get()
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Prometheus metrics (admin only)' })
  @ApiOkResponse({ description: 'Metrics in Prometheus text format' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing admin token' })
  async getMetrics() {
    return this.metrics.getMetrics();
  }
}
