import {
  IsString,
  IsNumber,
  Min,
  MaxLength,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CartItemType {
  SALE = 'sale',
  RENT = 'rent',
}

/**
 * REQ-BE-003: body contract for POST /api/cart/items (and the backward-compat
 * alias POST /api/cart/add).
 *
 * `cartId?` is an optional hint pointing at an existing cart (e.g. one created
 * by a recovery link). It is NEVER trusted for authorization — the service
 * re-scopes every write by the token-derived userId/guestSessionId and rejects
 * a mismatched cartId with 409.
 */
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

  @ApiPropertyOptional({
    description: 'Item type',
    enum: CartItemType,
    example: 'sale',
    readOnly: false,
  })
  @IsOptional()
  @IsEnum(CartItemType)
  type?: CartItemType;

  @ApiPropertyOptional({
    description: 'Rental start date (required when type=rent)',
    example: '2026-08-05T00:00:00.000Z',
    readOnly: false,
  })
  @IsOptional()
  @IsDateString()
  rentStart?: string;

  @ApiPropertyOptional({
    description: 'Rental end date (required when type=rent)',
    example: '2026-08-12T00:00:00.000Z',
    readOnly: false,
  })
  @IsOptional()
  @IsDateString()
  rentEnd?: string;

  @ApiPropertyOptional({
    description: 'Existing cart ID to attach the item to (optional hint)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsOptional()
  @IsUUID()
  cartId?: string;
}
