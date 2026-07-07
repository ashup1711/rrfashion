import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MergeCartDto {
  @ApiPropertyOptional({
    description: 'Guest session ID (preferred)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsOptional()
  @IsUUID()
  guestSessionId?: string;

  @ApiPropertyOptional({
    description: 'Legacy guest user ID (deprecated, kept for one release)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
    deprecated: true,
  })
  @IsOptional()
  @IsUUID()
  guestId?: string;
}
