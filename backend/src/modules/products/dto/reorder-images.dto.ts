import { IsArray, IsString, IsInt, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ImageOrderDto {
  @ApiProperty({ description: 'Image ID to reorder' })
  @IsString()
  @IsUUID()
  imageId!: string;

  @ApiProperty({ description: 'New sort order position' })
  @IsInt()
  sortOrder!: number;
}

export class ReorderImagesDto {
  @ApiProperty({ type: [ImageOrderDto], description: 'Array of image order updates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageOrderDto)
  orders!: ImageOrderDto[];
}
