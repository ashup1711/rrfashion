import { IsString, IsNumber, IsPositive, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCreditNoteDto {
  @ApiProperty({
    description: 'Invoice ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsString()
  invoiceId: string;

  @ApiProperty({
    description: 'Order item IDs being returned',
    example: ['550e8400-e29b-41d4-a716-446655440001'],
    readOnly: false,
  })
  @IsArray()
  @IsString({ each: true })
  orderItemIds: string[];

  @ApiProperty({ description: 'Refund amount', example: 1499, readOnly: false })
  @IsNumber()
  @IsPositive()
  refundAmount: number;

  @ApiProperty({
    description: 'Reason for credit note',
    example: 'Customer returned item',
    required: false,
    readOnly: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
