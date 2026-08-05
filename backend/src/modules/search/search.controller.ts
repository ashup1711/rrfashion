import { Controller, Get, Query, UseGuards, Header } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto, SearchResponseDto } from './dto/search-query.dto';
import { SearchAnalyticsQueryDto, SearchAnalyticsResult } from './dto/search-analytics-query.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * REQ-BE-008: Public full-text search endpoint.
   *
   * No authentication required — this is a public catalog endpoint.
   * Rate limiting is applied globally via ThrottlerProxyGuard.
   */
  @Get()
  @Throttle({ default: { ttl: 60000, limit: 30 } }) // SEC-10: 30 searches/min
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300')
  @ApiCommonResponse({
    summary: 'Search products with full-text search',
    type: SearchResponseDto,
    auth: false,
  })
  async search(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    return this.searchService.search(query);
  }

  /**
   * REQ-BE-008: Search analytics — admin-only.
   *
   * Returns popular queries, zero-result queries, total search count, etc.
   * Protected by AdminJwtAuthGuard + RolesGuard (SEC-06).
   */
  @Get('analytics')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Get search analytics (admin only)' })
  async getAnalytics(@Query() query: SearchAnalyticsQueryDto): Promise<SearchAnalyticsResult> {
    return this.searchService.getAnalytics(query);
  }
}
