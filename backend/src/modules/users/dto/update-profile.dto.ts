import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AddressDto {
  @ApiProperty({ description: 'Address type', example: 'home', readOnly: false })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Address line 1', example: '123 Main St', readOnly: false })
  @IsString()
  line1!: string;

  @ApiProperty({
    description: 'Address line 2',
    example: 'Apartment 4B',
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ description: 'City', example: 'Mumbai', readOnly: false })
  @IsString()
  city!: string;

  @ApiProperty({ description: 'State', example: 'Maharashtra', readOnly: false })
  @IsString()
  state!: string;

  @ApiProperty({ description: 'Pincode', example: '400001', readOnly: false })
  @IsString()
  pincode!: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: 'First name', example: 'John', required: false, readOnly: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: 'Last name', example: 'Doe', required: false, readOnly: false })
  @IsOptional()
  @IsString()
  lastName?: string;

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
    description: 'User addresses',
    type: AddressDto,
    isArray: true,
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];
}
