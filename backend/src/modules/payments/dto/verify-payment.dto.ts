import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Razorpay order ID', example: 'order_Oi7s8d9fgh', readOnly: false })
  @IsString()
  razorpayOrderId: string;

  @ApiProperty({ description: 'Razorpay payment ID', example: 'pay_Oi7s8d9fgh', readOnly: false })
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty({ description: 'Razorpay signature', example: 'signature_abc123', readOnly: false })
  @IsString()
  razorpaySignature: string;
}
