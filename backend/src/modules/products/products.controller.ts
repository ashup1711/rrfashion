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
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProductsService, ProductFilters } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OnSaleQueryDto } from './dto/on-sale-query.dto';
import { SetSaleDto } from './dto/set-sale.dto';
import { SaleProductResponseDto } from './dto/sale-product-response.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiCommonResponse({
    summary: 'Get all products',
    pagination: true,
    auth: false,
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('isFeatured') isFeatured?: string,
  ) {
    const filters: ProductFilters = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      categoryId,
      brandId,
      search,
      sortBy,
      sortOrder,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
    };

    return this.productsService.findAll(filters);
  }

  @Public()
  @Get('on-sale')
  @ApiCommonResponse({
    summary: 'Get products on sale',
    type: SaleProductResponseDto,
    isArray: true,
    auth: false,
  })
  async findOnSale(@Query() query: OnSaleQueryDto) {
    return this.productsService.findOnSale(query);
  }

  @Public()
  @Get(':id')
  @ApiCommonResponse({ summary: 'Get product by ID', auth: false })
  async findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  @ApiCommonResponse({ summary: 'Create a product', status: 201 })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  @ApiCommonResponse({ summary: 'Update product' })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/sale')
  @ApiCommonResponse({ summary: 'Set product sale price and notify users' })
  async setSalePrice(@Param('id') id: string, @Body() dto: SetSaleDto) {
    return this.productsService.setSalePrice(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  @ApiCommonResponse({ summary: 'Delete product' })
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
    return { message: 'Product deleted successfully' };
  }
}
