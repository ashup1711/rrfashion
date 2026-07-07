import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepositDto {
  @ApiProperty({ description: 'Amount in paise', readOnly: false })
  @IsNumber()
  amount: number;
}

export class CaptureDepositDto {
  @ApiProperty({ readOnly: false })
  @IsString()
  razorpayPreAuthId: string;

  @ApiPropertyOptional({ description: 'Amount in paise for partial capture', readOnly: false })
  @IsNumber()
  @IsOptional()
  amount?: number;
}

export class ReleaseDepositDto {
  @ApiProperty({ readOnly: false })
  @IsString()
  razorpayPreAuthId: string;
}
