import {
  IsString,
  IsArray,
  IsNumber,
  Min,
  MaxLength,
  ValidateNested,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class GuestCheckoutItemDto {
  @ApiProperty({
    description: 'Variant ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsString()
  variantId!: string;

  @ApiProperty({ description: 'Quantity', example: 1, minimum: 1, readOnly: false })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Item type', example: 'sale', required: false, readOnly: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  type?: string;
}

class ShippingAddressDto {
  @ApiProperty({ description: 'Full name', example: 'John Doe', readOnly: false })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Phone number', example: '9876543210', readOnly: false })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ description: 'Address line 1', example: '123 Main St', readOnly: false })
  @IsString()
  @MaxLength(255)
  line1!: string;

  @ApiProperty({
    description: 'Address line 2',
    example: 'Apartment 4B',
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @ApiProperty({ description: 'City', example: 'Mumbai', readOnly: false })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ description: 'State', example: 'Maharashtra', readOnly: false })
  @IsString()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ description: 'Pincode', example: '400001', readOnly: false })
  @IsString()
  @MaxLength(10)
  pincode!: string;
}

export class GuestCheckoutDto {
  @ApiProperty({
    description: 'Guest user ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    readOnly: false,
  })
  @IsString()
  guestId!: string;

  @ApiProperty({ description: 'Guest email', example: 'guest@example.com', readOnly: false })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Store ID for inventory locking',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiProperty({
    description: 'Order items',
    type: GuestCheckoutItemDto,
    isArray: true,
    readOnly: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCheckoutItemDto)
  items!: GuestCheckoutItemDto[];

  @ApiProperty({ description: 'Shipping address', type: ShippingAddressDto, readOnly: false })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiProperty({ description: 'Payment method', example: 'razorpay', readOnly: false })
  @IsString()
  paymentMethod!: string;
}
