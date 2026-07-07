import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@ApiTags('Admin Stores')
@Controller('admin/stores')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiCommonResponse({ summary: 'List all stores', isArray: true })
  async findAll() {
    return this.storesService.findAll();
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiCommonResponse({ summary: 'Create a store', status: 201 })
  async create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiCommonResponse({ summary: 'Get store by ID' })
  async findOne(@Param('id') id: string) {
    return this.storesService.findById(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiCommonResponse({ summary: 'Update store' })
  async update(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(id, dto);
  }
}
