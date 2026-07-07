import { IsString, IsArray, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateReturnDto {
  @ApiProperty({
    example: 'Product size does not fit',
    description: 'Reason for return',
    readOnly: false,
  })
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiProperty({
    example: ['order-item-uuid-1', 'order-item-uuid-2'],
    description: 'Order item IDs to return',
    readOnly: false,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds!: string[];

  @ApiProperty({ required: false, example: 'Package was slightly damaged', readOnly: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}
