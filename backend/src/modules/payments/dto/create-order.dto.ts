import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: 'Order ID', example: 'order-id-uuid', readOnly: false })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Amount in paise', example: 49900, readOnly: false })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'INR', required: false, readOnly: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Additional notes',
    example: { order_type: 'sale' },
    required: false,
    readOnly: false,
  })
  @IsOptional()
  notes?: Record<string, unknown>;
}
