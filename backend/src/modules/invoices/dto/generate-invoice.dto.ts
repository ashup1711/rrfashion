import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateInvoiceDto {
  @ApiProperty({
    description: 'Order ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Store ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
    readOnly: false,
  })
  @IsString()
  @IsOptional()
  storeId?: string;
}
