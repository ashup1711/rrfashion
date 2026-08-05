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
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import ExcelJS from 'exceljs';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProductsService, ProductFilters } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OnSaleQueryDto } from './dto/on-sale-query.dto';
import { SetSaleDto } from './dto/set-sale.dto';
import { SaleProductResponseDto } from './dto/sale-product-response.dto';
import { BulkUpdateDto } from './dto/bulk-operations.dto';
import { ProductVariantsSpecsResponseDto } from '../cart/dto/variant-spec.dto';

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
    @Query('onSale') onSale?: string,
    @Query('inStock') inStock?: string,
    @Query('outOfStock') outOfStock?: string,
    @Query('colors') colors?: string,
    @Query('sizes') sizes?: string,
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
      onSale: onSale !== undefined ? onSale === 'true' : undefined,
      inStock: inStock !== undefined ? inStock === 'true' : undefined,
      outOfStock: outOfStock !== undefined ? outOfStock === 'true' : undefined,
      colors: colors ? colors.split(',') : undefined,
      sizes: sizes ? sizes.split(',') : undefined,
    };

    return this.productsService.findAll(filters);
  }

  @Public()
  @Get('counts/by-category')
  @ApiCommonResponse({ summary: 'Get product counts by category and brand', auth: false })
  async getProductCounts() {
    return this.productsService.getProductCounts();
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

  @Public()
  @Get(':id/variants/specs')
  @ApiCommonResponse({
    summary: 'Get product variant specs for cart selection',
    type: ProductVariantsSpecsResponseDto,
    auth: false,
  })
  async getVariantSpecs(@Param('id') id: string) {
    return this.productsService.getVariantSpecsForCart(id);
  }

  // ── REQ-BE-013: Bulk Import / Export ──────────────────────────────

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('bulk/import')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max (SEC-09/SEC-11)
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV files are allowed'), false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCommonResponse({ summary: 'Bulk import products from CSV', status: 201 })
  async bulkImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    const csvContent = file.buffer.toString('utf-8');
    const rows = parseCsvRows(csvContent);

    if (rows.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const headers = rows[0];
    const dataRows: Array<Record<string, string>> = [];

    for (let i = 1; i < rows.length; i++) {
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = rows[i][j] ?? '';
      }
      dataRows.push(row);
    }

    return this.productsService.bulkImport(dataRows, userId);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('bulk/update')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiCommonResponse({ summary: 'Bulk update products (price, stock, status)', status: 200 })
  async bulkUpdate(@Body() dto: BulkUpdateDto, @CurrentUser('id') userId: string) {
    return this.productsService.bulkUpdate(dto, userId);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('export')
  @ApiCommonResponse({ summary: 'Export products as Excel file', auth: true })
  async exportProducts(@Res() res: Response) {
    const products = await this.productsService.exportAll();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RR Fashion';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Products');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Slug', key: 'slug', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Base Price', key: 'basePrice', width: 12 },
      { header: 'Sale Price', key: 'salePrice', width: 12 },
      { header: 'Stock', key: 'stock', width: 8 },
      { header: 'Active', key: 'isActive', width: 8 },
      { header: 'Featured', key: 'isFeatured', width: 10 },
      { header: 'Rentable', key: 'isRentable', width: 10 },
      { header: 'Sellable', key: 'isSellable', width: 10 },
      { header: 'Category ID', key: 'categoryId', width: 36 },
      { header: 'Brand ID', key: 'brandId', width: 36 },
      { header: 'Fabric', key: 'fabric', width: 20 },
      { header: 'HSN Code', key: 'hsnCode', width: 12 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const product of products) {
      sheet.addRow({
        ...product,
        basePrice: Number(product.basePrice),
        salePrice: product.salePrice ? Number(product.salePrice) : '',
        createdAt: product.createdAt.toISOString(),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(buffer));
  }
}

/**
 * Parse CSV content handling quoted fields with commas and escaped quotes.
 * Returns an array of rows, each row being an array of string values.
 */
function parseCsvRows(csvContent: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote inside quoted field
        currentField += '"';
        i++; // skip next quote
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else if (char === '"') {
      // Start of quoted field
      inQuotes = true;
    } else if (char === ',') {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      if (char === '\r') i++; // skip \n after \r
    } else if (char === '\r') {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Flush last field/row
  currentRow.push(currentField.trim());
  if (currentRow.some((f) => f.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}
