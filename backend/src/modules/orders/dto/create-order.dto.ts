import { IsString, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShippingAddressDto {
  @ApiProperty({ description: 'Full name', example: 'ASHUTOSH RAVAL', readOnly: false })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Phone number', example: '+919725408903', readOnly: false })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({
    description: 'Address line 1',
    example: 'G 803 samved greenvalley',
    readOnly: false,
  })
  @IsString()
  @MaxLength(255)
  line1!: string;

  @ApiPropertyOptional({ description: 'Address line 2', example: 'Sargasan', readOnly: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @ApiProperty({ description: 'City', example: 'Gandhinagar', readOnly: false })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ description: 'State', example: 'Gujarat', readOnly: false })
  @IsString()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ description: 'Pincode', example: '382006', readOnly: false })
  @IsString()
  @MaxLength(10)
  pincode!: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Shipping address', type: ShippingAddressDto, readOnly: false })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiProperty({ description: 'Payment method', example: 'razorpay', readOnly: false })
  @IsString()
  paymentMethod!: string;

  @ApiPropertyOptional({
    description: 'Store ID for inventory locking',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Order notes',
    example: 'Leave at the door',
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
