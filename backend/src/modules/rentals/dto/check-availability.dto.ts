import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @ApiProperty()
  @IsString()
  variantId: string;

  @ApiProperty({ example: '2026-07-05' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-07-10' })
  @IsDateString()
  endDate: string;
}
