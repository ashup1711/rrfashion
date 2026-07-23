import { IsString, IsOptional, IsInt, Min, Max, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Product ID', readOnly: false })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Rating 1-5', readOnly: false })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Review comment', required: false, readOnly: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'Photo URLs', required: false, readOnly: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
