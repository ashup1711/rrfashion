import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({
    description: 'Refresh token to revoke',
    example: 'uuid-refresh-token',
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
