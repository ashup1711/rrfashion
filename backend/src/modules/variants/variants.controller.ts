import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@ApiTags('Product Variants')
@Controller()
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Public()
  @Get('products/:productId/variants')
  @ApiCommonResponse({
    summary: 'Get variants for a product',
    isArray: true,
    auth: false,
  })
  async findByProduct(@Param('productId') productId: string) {
    return this.variantsService.findByProduct(productId);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('products/:productId/variants')
  @ApiCommonResponse({ summary: 'Create a variant', status: 201 })
  async create(@Param('productId') productId: string, @Body() dto: CreateVariantDto) {
    return this.variantsService.create(productId, dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('variants/:id')
  @ApiCommonResponse({ summary: 'Update variant' })
  async update(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.variantsService.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete('variants/:id')
  @ApiCommonResponse({ summary: 'Delete variant' })
  async remove(@Param('id') id: string) {
    await this.variantsService.remove(id);
    return { message: 'Variant deleted successfully' };
  }
}
