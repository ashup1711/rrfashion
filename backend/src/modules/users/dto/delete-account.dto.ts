import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Current password for verification' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Optional reason for account deletion' })
  @IsString()
  @IsOptional()
  reason?: string;
}
