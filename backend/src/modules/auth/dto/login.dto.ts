import { IsEmail, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com', readOnly: false })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'User password', example: 'securePass123', readOnly: false })
  @IsString()
  password!: string;

  @ApiPropertyOptional({ description: 'Guest session ID to migrate on login' })
  @IsOptional()
  @IsUUID()
  guestSessionId?: string;

  @ApiPropertyOptional({
    description: 'Legacy guest user ID to merge on login (deprecated)',
    deprecated: true,
  })
  @IsOptional()
  @IsUUID()
  guestId?: string;
}
