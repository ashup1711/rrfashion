import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DashboardQueryDto {
  @ApiProperty({
    description: 'Dashboard view period',
    enum: ['day', 'week', 'month', 'year'],
    default: 'month',
    required: false,
    readOnly: false,
  })
  @IsEnum(['day', 'week', 'month', 'year'])
  @IsOptional()
  view?: 'day' | 'week' | 'month' | 'year';
}
