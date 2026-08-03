/**
 * REQ-BE-006: Per-item return request DTO.
 *
 * The body shape is an array of items, each with its own quantity, reason,
 * photos (already-uploaded asset keys), and notes. The owning order is in
 * the URL path; ownership is verified server-side via assertOrderOwnership.
 */
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnReason } from '@prisma/client';

export class ReturnItemDto {
  @ApiProperty({ description: 'OrderItem.id (UUID) being returned', format: 'uuid' })
  @IsUUID('4', { message: 'orderItemId must be a UUID v4' })
  orderItemId!: string;

  @ApiProperty({ description: 'How many units of this line are being returned', minimum: 1 })
  @IsInt()
  @Min(1, { message: 'quantity must be at least 1' })
  quantity!: number;

  @ApiProperty({
    description: 'Structured reason code',
    enum: ReturnReason,
    example: ReturnReason.SIZE_ISSUE,
  })
  @IsEnum(ReturnReason, {
    message: `reason must be one of: ${Object.values(ReturnReason).join(', ')}`,
  })
  reason!: ReturnReason;

  @ApiPropertyOptional({
    description: 'Already-uploaded photo asset keys (from the upload pipeline)',
    type: [String],
    example: ['returns/abc/photo-1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  photos?: string[];

  @ApiPropertyOptional({
    description: 'Free-text notes from the customer (max 2000 chars)',
    example: 'Color was different from the website',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateReturnRequestDto {
  @ApiProperty({
    description: 'Per-item return details (at least one item required)',
    type: () => ReturnItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required for a return' })
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];
}
