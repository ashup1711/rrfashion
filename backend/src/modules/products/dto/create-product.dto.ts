import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Cotton Kurti', readOnly: false })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'URL slug',
    example: 'cotton-kurti',
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({
    description: 'Product description',
    example: 'A beautiful cotton kurti...',
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Base price', example: 2499, minimum: 0, readOnly: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice!: number;

  @ApiProperty({
    description: 'Sale price',
    example: 1499,
    minimum: 0,
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePrice?: number;

  @ApiProperty({
    description: 'Product images URLs',
    example: ['https://cdn.example.com/img1.jpg'],
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: 'Stock count',
    example: 50,
    minimum: 0,
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({
    description: 'Featured product',
    example: false,
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsString()
  categoryId!: string;

  @ApiProperty({
    description: 'Brand ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiProperty({ description: 'Fabric type', example: 'Cotton', required: false, readOnly: false })
  @IsOptional()
  @IsString()
  fabric?: string;

  @ApiProperty({ description: 'HSN code', example: '6204', required: false, readOnly: false })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiProperty({
    description: 'Available for rent',
    example: false,
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsBoolean()
  isRentable?: boolean;

  @ApiProperty({
    description: 'Available for sale',
    example: true,
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsBoolean()
  isSellable?: boolean;

  @ApiProperty({
    description: 'Care instructions',
    example: 'Dry clean only',
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  careInstructions?: string;

  @ApiProperty({
    description: 'Sort priority',
    example: 0,
    minimum: 0,
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortPriority?: number;
}
