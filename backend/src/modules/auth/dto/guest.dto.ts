import { ApiProperty } from '@nestjs/swagger';

export class GuestResponseDto {
  @ApiProperty({
    description: 'Guest user ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: true,
  })
  guestId!: string;

  @ApiProperty({
    description: 'Guest JWT token',
    example: 'eyJhbGciOiJIUzI1NiIs...',
    readOnly: true,
  })
  guestToken!: string;
}
