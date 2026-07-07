import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShippingAddressDto {
  @ApiProperty({ description: 'Full name', example: 'John Doe', readOnly: false })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Phone number', example: '9876543210', readOnly: false })
  @IsString()
  phone!: string;

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
