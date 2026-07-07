import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['PERCENT', 'FLAT'] })
  @IsEnum(['PERCENT', 'FLAT'])
  type: 'PERCENT' | 'FLAT';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minCartValue?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDiscount?: number;

  @ApiProperty({ enum: ['ALL', 'SALE', 'RENT'], required: false })
  @IsEnum(['ALL', 'SALE', 'RENT'])
  @IsOptional()
  appliesTo?: 'ALL' | 'SALE' | 'RENT';

  @ApiProperty({ required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  brandIds?: string[];

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  usageLimit?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  perUserLimit?: number;

  @ApiProperty()
  @IsDateString()
  validFrom: string;

  @ApiProperty()
  @IsDateString()
  validUntil: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
