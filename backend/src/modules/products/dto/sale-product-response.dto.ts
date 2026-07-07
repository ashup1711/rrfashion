import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

class SaleCategoryDto {
  @Expose()
  @ApiProperty({ description: 'Category ID', example: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Category name', example: 'Ethnic' })
  name!: string;
}

class SaleVariantDto {
  @Expose()
  @ApiProperty({ description: 'Variant ID', example: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Size', example: 'M' })
  size!: string;

  @Expose()
  @ApiProperty({ description: 'Color', example: 'Red' })
  color!: string;

  @Expose()
  @ApiProperty({ description: 'Variant sale price', example: 1499, nullable: true })
  salePrice!: number | null;
}

export class SaleProductResponseDto {
  @Expose()
  @ApiProperty({ description: 'Product ID', example: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Product name', example: 'Product Name' })
  name!: string;

  @Expose()
  @ApiProperty({ description: 'URL slug', example: 'product-name' })
  slug!: string;

  @Expose()
  @ApiProperty({ description: 'Product images', example: ['url1', 'url2'] })
  images!: string[];

  @Expose()
  @ApiProperty({ description: 'Base price', example: 2499 })
  basePrice!: number;

  @Expose()
  @ApiProperty({ description: 'Sale price', example: 1499, nullable: true })
  salePrice!: number | null;

  @Expose()
  @ApiProperty({ description: 'Discount percentage', example: 40, nullable: true })
  discountPercent!: number | null;

  @Expose()
  @ApiProperty({ description: 'Category', type: SaleCategoryDto })
  category!: SaleCategoryDto;

  @Expose()
  @ApiProperty({ description: 'Product variants', type: SaleVariantDto, isArray: true })
  variants!: SaleVariantDto[];
}
