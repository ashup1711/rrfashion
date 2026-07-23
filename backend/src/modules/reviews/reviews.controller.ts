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
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { GuestSessionId } from '../../common/decorators/guest-session-id.decorator';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(StoreAuthGuard)
@AllowGuest(true)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiCommonResponse({ summary: 'Create a new review', status: 201, type: CreateReviewDto })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createReviewDto: CreateReviewDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.reviewsService.create(userId, createReviewDto, guestSessionId);
  }

  @Get()
  @ApiCommonResponse({
    summary: 'Get approved reviews and current user reviews',
    type: CreateReviewDto,
    isArray: true,
    pagination: true,
  })
  async findAll(@CurrentUser('id') userId: string, @Query() query: ReviewFilterDto) {
    return this.reviewsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiCommonResponse({ summary: 'Get review by ID', type: CreateReviewDto })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.reviewsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiCommonResponse({ summary: 'Update a review', type: UpdateReviewDto })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(userId, id, updateReviewDto);
  }

  @Delete(':id')
  @ApiCommonResponse({ summary: 'Delete a review' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.reviewsService.remove(userId, id);
  }
}
