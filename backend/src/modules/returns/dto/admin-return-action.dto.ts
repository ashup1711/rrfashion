/**
 * REQ-BE-007: Admin return-approval request DTO.
 *
 * `partialRefundAmount` is optional — when present it caps the auto-computed
 * refund total. `adminNotes` is free-text and stored on the ReturnRequest.
 */
import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveReturnDto {
  @ApiPropertyOptional({
    description: 'Optional per-approval cap on the total refund (in INR, decimal)',
    example: 500,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  partialRefundAmount?: number;

  @ApiPropertyOptional({
    description: 'Internal admin notes (max 2000 chars)',
    example: 'Approved with 50% refund for missing tags',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}

export class RejectReturnDto {
  @ApiProperty({
    description: 'Reason for rejection (max 2000 chars)',
    example: 'Item shows wear inconsistent with rental policy',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  adminNotes!: string;
}
