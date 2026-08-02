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
import { SiteRemindersService } from './site-reminders.service';
import { CreateSiteReminderDto } from './dto/create-site-reminder.dto';
import { UpdateSiteReminderDto } from './dto/update-site-reminder.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Site Reminders (Admin)')
@Controller('admin/reminders')
export class SiteRemindersController {
  constructor(private readonly siteRemindersService: SiteRemindersService) {}

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a site reminder' })
  async create(@Body() dto: CreateSiteReminderDto) {
    return this.siteRemindersService.create(dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  @ApiOperation({ summary: 'List all site reminders (paginated)' })
  async findAll(@Query() query: PaginationDto, @Query('search') search?: string) {
    return this.siteRemindersService.findAll(query, search);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  @ApiOperation({ summary: 'Get a site reminder by ID' })
  async findById(@Param('id') id: string) {
    return this.siteRemindersService.findById(id);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a site reminder' })
  async update(@Param('id') id: string, @Body() dto: UpdateSiteReminderDto) {
    return this.siteRemindersService.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a site reminder' })
  async remove(@Param('id') id: string) {
    return this.siteRemindersService.remove(id);
  }
}
