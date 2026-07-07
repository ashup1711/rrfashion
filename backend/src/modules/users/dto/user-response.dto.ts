import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: true,
  })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Email address', example: 'user@example.com', readOnly: false })
  email!: string;

  @Expose()
  @ApiProperty({ description: 'First name', example: 'John', readOnly: false })
  firstName!: string;

  @Expose()
  @ApiProperty({ description: 'Last name', example: 'Doe', readOnly: false })
  lastName!: string;

  @Expose()
  @ApiProperty({
    description: 'Phone number',
    example: '9876543210',
    required: false,
    readOnly: false,
  })
  phone?: string;

  @Expose()
  @ApiProperty({ description: 'User role', example: 'CUSTOMER', readOnly: true })
  role!: string;

  @Expose()
  @ApiProperty({
    description: 'Profile photo URL',
    example: 'https://cdn.example.com/uploads/profiles/user123/photo.jpg',
    required: false,
    readOnly: true,
  })
  profilePhoto?: string;

  @Expose()
  @ApiProperty({
    description: 'Profile photo storage key',
    example: 'profiles/user123/photo.jpg',
    required: false,
    readOnly: true,
  })
  profilePhotoKey?: string;

  @Expose()
  @ApiProperty({
    description: 'Account creation date',
    example: '2026-01-01T00:00:00Z',
    readOnly: true,
  })
  createdAt!: Date;

  @Expose()
  @ApiProperty({ description: 'Last update date', example: '2026-06-15T10:30:00Z', readOnly: true })
  updatedAt!: Date;
}
