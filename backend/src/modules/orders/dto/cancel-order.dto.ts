/**
 * REQ-BE-001: Customer-facing order cancellation request.
 *
 * The `reason` is a structured enum (mirrors the Prisma `CancellationReason`
 * enum) so downstream analytics and refund flows can branch on intent
 * without parsing free text. `notes` is optional and capped at 1000 chars.
 */
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationReason } from '@prisma/client';

export class CancelOrderDto {
  @ApiProperty({
    description: 'Structured cancellation reason',
    enum: CancellationReason,
    example: CancellationReason.CUSTOMER_REQUEST,
  })
  @IsEnum(CancellationReason, {
    message: `reason must be one of: ${Object.values(CancellationReason).join(', ')}`,
  })
  reason!: CancellationReason;

  @ApiPropertyOptional({
    description: 'Free-text notes attached to the cancellation (max 1000 chars)',
    example: 'Changed my mind',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
