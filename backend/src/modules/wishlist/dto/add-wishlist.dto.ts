import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddWishlistDto {
  @ApiProperty({
    description: 'Variant ID to add to wishlist',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsString()
  variantId: string;

  @ApiProperty({
    description: 'Notify on restock',
    example: false,
    required: false,
    readOnly: false,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnRestock?: boolean;

  @ApiProperty({
    description: 'Notify on price drop',
    example: true,
    required: false,
    readOnly: false,
  })
  @IsBoolean()
  @IsOptional()
  notifyOnPriceDrop?: boolean;
}
