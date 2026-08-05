import { IsEmail, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com', readOnly: false })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description:
      'Password — min 10 chars, must include uppercase, lowercase, digit, and symbol (REQ-BE-010)',
    example: 'Str0ng!Pass',
    minLength: 10,
    readOnly: false,
  })
  @IsStrongPassword()
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
}
