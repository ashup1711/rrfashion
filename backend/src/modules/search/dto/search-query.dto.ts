import { IsString, IsOptional, IsInt, IsBoolean, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({ description: 'Free-text search query', example: 'silk lehenga' })
  @IsString()
  @MaxLength(256)
  q!: string;

  @ApiProperty({ description: 'Filter by category id', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Only in-stock products', required: false })
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @ApiProperty({ description: 'Page number (1-based)', required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SearchResultItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() description!: string | null;
  @ApiProperty() basePrice!: number;
  @ApiProperty() salePrice!: number | null;
  @ApiProperty() images!: string[];
  @ApiProperty() stock!: number;
  @ApiProperty() isRentable!: boolean;
  @ApiProperty() isSellable!: boolean;
  @ApiProperty() categoryId!: string;
  @ApiProperty() brandId!: string | null;
  @ApiProperty({ type: 'number', format: 'double' }) rank!: number;
}

export class SearchResponseDto {
  @ApiProperty({ type: SearchResultItemDto, isArray: true })
  items!: SearchResultItemDto[];
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
  @ApiProperty()
  query!: string;
}
