import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TopProductsQueryDto {
  @ApiProperty({
    description: 'View period (alternative to startDate/endDate)',
    enum: ['day', 'week', 'month', 'year'],
    required: false,
  })
  @IsEnum(['day', 'week', 'month', 'year'])
  @IsOptional()
  view?: 'day' | 'week' | 'month' | 'year';

  @ApiProperty({ description: 'Category ID filter', required: false, readOnly: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ description: 'Brand ID filter', required: false, readOnly: false })
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiProperty({
    description: 'Channel filter',
    enum: ['sale', 'rent'],
    required: false,
    readOnly: false,
  })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiProperty({ description: 'Start date (ISO string)', required: false, readOnly: false })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date (ISO string)', required: false, readOnly: false })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Result limit', required: false, readOnly: false })
  @IsNumber()
  @IsOptional()
  limit?: number;
}
