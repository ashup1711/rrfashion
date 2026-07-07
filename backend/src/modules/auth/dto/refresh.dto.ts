import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token', example: 'uuid-refresh-token', readOnly: false })
  @IsString()
  refreshToken!: string;
}
