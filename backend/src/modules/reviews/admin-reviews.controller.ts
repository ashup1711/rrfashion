import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';

@ApiTags('Admin Reviews')
@Controller('admin/reviews')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
  @ApiCommonResponse({ summary: 'Get all reviews (admin)', pagination: true })
  async findAll(@Query() filter: ReviewFilterDto) {
    return this.reviewsService.findAllAdmin(filter);
  }

  @Patch(':id/moderate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiCommonResponse({ summary: 'Moderate a review (approve/reject)', status: 200 })
  async moderate(
    @Param('id') id: string,
    @Body() moderateDto: ModerateReviewDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.reviewsService.moderate(id, moderateDto, adminId);
  }
}
