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
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('News (Admin)')
@Controller('admin/news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a news item' })
  async create(@Body() dto: CreateNewsDto, @CurrentUser('id') adminId: string) {
    return this.newsService.create(dto, adminId);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  @ApiOperation({ summary: 'List all news items (paginated)' })
  async findAll(@Query() query: PaginationDto, @Query('search') search?: string) {
    return this.newsService.findAll(query, search);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  @ApiOperation({ summary: 'Get a news item by ID' })
  async findOne(@Param('id') id: string) {
    return this.newsService.findOne(id);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a news item' })
  async update(@Param('id') id: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a news item' })
  async remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
