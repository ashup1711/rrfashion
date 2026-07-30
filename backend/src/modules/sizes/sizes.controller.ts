import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SizesService } from './sizes.service';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';

@ApiTags('Sizes')
@Controller('sizes')
export class SizesController {
  constructor(private readonly sizesService: SizesService) {}

  @Public()
  @Get()
  @ApiCommonResponse({ summary: 'Get all sizes', isArray: true, auth: false })
  async findAll() {
    return this.sizesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiCommonResponse({ summary: 'Get size by ID', auth: false })
  async findOne(@Param('id') id: string) {
    return this.sizesService.findById(id);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  @ApiCommonResponse({ summary: 'Create a size', status: 201 })
  async create(@Body() dto: CreateSizeDto) {
    return this.sizesService.create(dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  @ApiCommonResponse({ summary: 'Update size' })
  async update(@Param('id') id: string, @Body() dto: UpdateSizeDto) {
    return this.sizesService.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @ApiCommonResponse({ summary: 'Delete size' })
  async remove(@Param('id') id: string) {
    await this.sizesService.remove(id);
    return { message: 'Size deleted successfully' };
  }
}
