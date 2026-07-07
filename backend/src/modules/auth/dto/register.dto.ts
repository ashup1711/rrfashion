import { IsEmail, IsString, MinLength, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com', readOnly: false })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password (min 6 chars)', example: 'securePass123', readOnly: false })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ description: 'First name', example: 'John', readOnly: false })
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Last name', example: 'Doe', readOnly: false })
  @IsString()
  lastName!: string;

  @ApiProperty({
    description: 'Phone number',
    example: '9876543210',
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Guest session ID to migrate on registration' })
  @IsOptional()
  @IsUUID()
  guestSessionId?: string;

  @ApiPropertyOptional({
    description: 'Legacy guest user ID to merge on registration (deprecated)',
    deprecated: true,
  })
  @IsOptional()
  @IsUUID()
  guestId?: string;
}
