import { IsString, IsNumber, IsOptional, Min, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InspectRentalDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  lateFee?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  damageCharge?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  damageNotes?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  damagePhotos?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  closeNotes?: string;
}
