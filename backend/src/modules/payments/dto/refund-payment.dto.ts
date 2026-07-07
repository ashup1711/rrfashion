import { IsString, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiProperty({ description: 'Payment ID', example: 'pay_Oi7s8d9fgh', readOnly: false })
  @IsString()
  paymentId: string;

  @ApiProperty({
    description: 'Refund amount (optional, defaults to full)',
    required: false,
    readOnly: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;
}
