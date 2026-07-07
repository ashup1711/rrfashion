import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExportQueryDto {
  @ApiProperty({
    description: 'Report type',
    enum: ['sales', 'inventory', 'rentals'],
    readOnly: false,
  })
  @IsEnum(['sales', 'inventory', 'rentals'])
  reportType: 'sales' | 'inventory' | 'rentals';

  @ApiProperty({ description: 'Export format', enum: ['pdf', 'xlsx'], readOnly: false })
  @IsEnum(['pdf', 'xlsx'])
  format: 'pdf' | 'xlsx';

  @ApiProperty({ description: 'Additional parameters', required: false, readOnly: false })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, unknown>;
}
