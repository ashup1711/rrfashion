import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

class CartProductDto {
  @Expose()
  @ApiProperty({ description: 'Product ID', example: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Product name', example: 'Cotton Kurti' })
  name!: string;

  @Expose()
  @ApiProperty({ description: 'URL slug', example: 'cotton-kurti' })
  slug!: string;

  @Expose()
  @ApiProperty({ description: 'Product images', example: ['https://cdn.example.com/img.jpg'] })
  images!: string[];

  @Expose()
  @ApiProperty({ description: 'Base price', example: 2499 })
  basePrice!: number;

  @Expose()
  @ApiProperty({ description: 'Sale price', example: 1499, nullable: true })
  salePrice!: number | null;
}

class CartVariantDto {
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
  @ApiProperty({ description: 'SKU', example: 'KT-001-M-RED' })
  sku!: string;

  @Expose()
  @ApiProperty({ description: 'Variant sale price', example: 1499, nullable: true })
  salePrice!: number | null;
}

class CartItemDto {
  @Expose()
  @ApiProperty({ description: 'Cart item ID', example: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Variant ID', example: 'uuid', nullable: true })
  variantId!: string | null;

  @Expose()
  @ApiProperty({ description: 'Product ID', example: 'uuid' })
  productId!: string;

  @Expose()
  @ApiProperty({ description: 'Product details', type: CartProductDto })
  product!: CartProductDto;

  @Expose()
  @ApiProperty({ description: 'Variant details', type: CartVariantDto, nullable: true })
  variant!: CartVariantDto | null;

  @Expose()
  @ApiProperty({ description: 'Quantity', example: 1 })
  quantity!: number;

  @Expose()
  @ApiProperty({ description: 'Item type', example: 'sale' })
  type!: string;

  @Expose()
  @ApiProperty({ description: 'Unit price', example: 1499 })
  unitPrice!: number;
}

export class CartResponseDto {
  @Expose()
  @ApiProperty({ description: 'Cart ID', example: 'uuid' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Cart items', type: CartItemDto, isArray: true })
  items!: CartItemDto[];

  @Expose()
  @ApiProperty({ description: 'Total item count', example: 3 })
  itemCount!: number;

  @Expose()
  @ApiProperty({ description: 'Cart total', example: 4497 })
  total!: number;
}
