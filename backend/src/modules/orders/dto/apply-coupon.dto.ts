import { IsString, IsNumber, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyCouponDto {
  @ApiProperty({ example: 'SAVE20', description: 'Coupon code', readOnly: false })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({
    example: 2500,
    description: 'Current cart total before discount',
    readOnly: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cartTotal!: number;
}
