import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

class UnavailableDetailDto {
  @Expose()
  @ApiProperty({ description: 'Product name', example: 'Old Kurta' })
  productName!: string;

  @Expose()
  @ApiProperty({ description: 'Reason for unavailability', example: 'out_of_stock' })
  reason!: string;
}

export class RepurchaseResponseDto {
  @Expose()
  @ApiProperty({ description: 'Number of items successfully added to cart', example: 3 })
  itemsAdded!: number;

  @Expose()
  @ApiProperty({ description: 'Number of unavailable items', example: 1 })
  unavailableItems!: number;

  @Expose()
  @ApiProperty({
    description: 'Details of unavailable items',
    type: UnavailableDetailDto,
    isArray: true,
  })
  unavailableDetails!: UnavailableDetailDto[];

  @Expose()
  @ApiProperty({ description: 'Updated cart object' })
  cart!: unknown;
}
