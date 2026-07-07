import { IsDateString, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtendRentalDto {
  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  newEndDate: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  additionalCharge: number;
}
