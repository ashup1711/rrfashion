import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MergeGuestDto {
  @ApiPropertyOptional({
    description: 'Guest session ID to merge into the authenticated account',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsOptional()
  @IsUUID()
  guestSessionId?: string;
}
