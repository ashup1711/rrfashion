import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum Role {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export class CreateUserDto {
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

  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: 'CUSTOMER',
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
