import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminRefreshDto {
  @ApiPropertyOptional({
    description: 'Refresh token. Optional when sent as the `admin_refresh_token` cookie.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
