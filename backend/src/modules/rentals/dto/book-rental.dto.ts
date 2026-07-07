import { IsString, IsDateString, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BookRentalDto {
  @ApiProperty()
  @IsString()
  orderItemId: string;

  @ApiProperty()
  @IsString()
  unitId: string;

  @ApiProperty()
  @IsString()
  storeId: string;

  @ApiProperty({ example: '2026-07-05' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-07-10' })
  @IsDateString()
  endDate: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  depositAmount: number;
}
