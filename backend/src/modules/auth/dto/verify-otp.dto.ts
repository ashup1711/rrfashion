import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ description: 'Phone number', example: '9876543210', readOnly: false })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'OTP code', example: '123456', readOnly: false })
  @IsString()
  otp: string;

  @ApiProperty({ description: 'OTP purpose', example: 'signup', required: false, readOnly: false })
  @IsOptional()
  @IsString()
  purpose?: string;
}
