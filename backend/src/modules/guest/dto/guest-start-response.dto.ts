import { ApiProperty } from '@nestjs/swagger';

export class GuestStartResponseDto {
  @ApiProperty({ description: 'Guest session ID (UUID v4)' })
  guestSessionId!: string;

  @ApiProperty({ description: 'Guest JWT token for authenticating store API requests' })
  guestToken!: string;

  @ApiProperty({ description: 'When this guest session expires' })
  expiresAt!: Date;
}
