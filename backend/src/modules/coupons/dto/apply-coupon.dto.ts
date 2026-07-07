import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyCouponDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  cartItemIds: string[];
}
