import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PosOrderItem {
  @IsString()
  variantId!: string;

  @IsNumber()
  quantity!: number;

  @IsString()
  type!: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsDateString()
  rentStart?: string;

  @IsOptional()
  @IsDateString()
  rentEnd?: string;
}

export class PosOrderDto {
  @ApiProperty()
  clientUuid: string;

  @ApiProperty()
  @IsString()
  storeId: string;

  @ApiProperty()
  @IsString()
  customerName: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosOrderItem)
  items!: PosOrderItem[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
