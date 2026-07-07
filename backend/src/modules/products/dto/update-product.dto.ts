import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({
    description: 'Product active status',
    example: true,
    required: false,
    readOnly: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
