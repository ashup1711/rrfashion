import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ColorsService } from './colors.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';

@ApiTags('Colors')
@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Public()
  @Get()
  @ApiCommonResponse({ summary: 'Get all colors', isArray: true, auth: false })
  async findAll() {
    return this.colorsService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiCommonResponse({ summary: 'Get color by ID', auth: false })
  async findOne(@Param('id') id: string) {
    return this.colorsService.findById(id);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  @ApiCommonResponse({ summary: 'Create a color', status: 201 })
  async create(@Body() dto: CreateColorDto) {
    return this.colorsService.create(dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  @ApiCommonResponse({ summary: 'Update color' })
  async update(@Param('id') id: string, @Body() dto: UpdateColorDto) {
    return this.colorsService.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @ApiCommonResponse({ summary: 'Delete color' })
  async remove(@Param('id') id: string) {
    await this.colorsService.remove(id);
    return { message: 'Color deleted successfully' };
  }
}
