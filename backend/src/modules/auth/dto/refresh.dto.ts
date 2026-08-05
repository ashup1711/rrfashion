import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshDto {
  @ApiPropertyOptional({
    description: 'Refresh token. Optional when sent as the `refresh_token` cookie.',
    example: 'uuid-refresh-token',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
