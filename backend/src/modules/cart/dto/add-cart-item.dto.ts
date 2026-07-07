import { IsString, IsNumber, Min, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CartItemType {
  SALE = 'sale',
  RENT = 'rent',
}

export class AddCartItemDto {
  @ApiProperty({
    description: 'Variant ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsString()
  @MaxLength(36)
  variantId!: string;

  @ApiProperty({ description: 'Quantity', example: 1, minimum: 1, readOnly: false })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Item type', enum: CartItemType, example: 'sale', readOnly: false })
  @IsEnum(CartItemType)
  type!: 'sale' | 'rent';
}
