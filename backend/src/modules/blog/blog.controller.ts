import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Blog (Admin)')
@Controller('admin/blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a blog post' })
  async create(@Body() dto: CreateBlogDto, @CurrentUser('id') adminId: string) {
    return this.blogService.create(dto, adminId);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  @ApiOperation({ summary: 'List all blog posts (paginated)' })
  async findAll(
    @Query() query: PaginationDto & { status?: string; category?: string },
  ) {
    return this.blogService.findAll(query);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  @ApiOperation({ summary: 'Get a blog post by ID' })
  async findOne(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a blog post' })
  async update(@Param('id') id: string, @Body() dto: UpdateBlogDto) {
    return this.blogService.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blog post' })
  async remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}
