import { ApiProperty } from '@nestjs/swagger';

export class AdminSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ required: false })
  userAgent?: string;
}

export class RevokeAllSessionsResponseDto {
  @ApiProperty({ example: 'All sessions revoked' })
  message!: string;

  @ApiProperty({ example: 3 })
  count!: number;
}

export class RevokeSessionResponseDto {
  @ApiProperty({ example: 'Session revoked' })
  message!: string;
}
