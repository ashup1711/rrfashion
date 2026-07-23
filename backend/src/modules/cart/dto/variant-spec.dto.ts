import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class VariantSpecDto {
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
  @ApiProperty({ description: 'Sale price', example: 1499, nullable: true })
  salePrice?: number;

  @Expose()
  @ApiProperty({ description: 'Available stock', example: 10 })
  stock!: number;

  @Expose()
  @ApiProperty({ description: 'Whether variant is available (stock > 0 and active)', example: true })
  isAvailable!: boolean;

  @Expose()
  @ApiProperty({ description: 'SKU', example: 'KT-001-M-RED' })
  sku!: string;
}

export class ProductVariantsSpecsResponseDto {
  @Expose()
  @ApiProperty({ description: 'Product ID', example: 'uuid' })
  productId!: string;

  @Expose()
  @ApiProperty({ description: 'Array of variant specs', type: VariantSpecDto, isArray: true })
  variants!: VariantSpecDto[];
}
