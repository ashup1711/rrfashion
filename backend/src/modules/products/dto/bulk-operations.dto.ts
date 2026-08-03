import { IsArray, ValidateNested, IsString, IsNumber, IsOptional, IsBoolean, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkUpdateItemDto {
  @ApiProperty({ description: 'Product ID to update' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ description: 'New base price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ description: 'New sale price (null to clear)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number | null;

  @ApiPropertyOptional({ description: 'New stock count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Set active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Set featured status' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class BulkUpdateDto {
  @ApiProperty({ description: 'Array of product updates', type: [BulkUpdateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  updates!: BulkUpdateItemDto[];
}

export interface BulkImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
  total: number;
}

export interface BulkUpdateResult {
  updated: number;
  errors: Array<{ productId: string; message: string }>;
  total: number;
}
