import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OnSaleQueryDto {
  @ApiProperty({ description: 'Category ID filter', required: false, readOnly: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: 'Brand ID filter', required: false, readOnly: false })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiProperty({ description: 'Minimum price', required: false, readOnly: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiProperty({ description: 'Maximum price', required: false, readOnly: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiProperty({ description: 'Page number', example: 1, required: false, readOnly: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiProperty({ description: 'Items per page', example: 20, required: false, readOnly: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
