import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BlogService } from './blog.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Blog (Public)')
@Controller('blogs')
export class BlogPublicController {
  constructor(private readonly blogService: BlogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published blog posts (paginated)' })
  async findPublished(
    @Query() query: PaginationDto & { category?: string },
  ) {
    return this.blogService.findPublished(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a single blog post by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }
}
