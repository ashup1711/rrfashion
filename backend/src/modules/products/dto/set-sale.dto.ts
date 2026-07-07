import { IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetSaleDto {
  @ApiProperty({ description: 'Sale price', example: 1499, minimum: 0, readOnly: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePrice!: number;

  @ApiProperty({
    description: 'Notify users who wishlisted this product',
    example: true,
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyWishlistUsers?: boolean;
}
