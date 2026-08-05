import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NewsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  excerpt: string;

  @ApiPropertyOptional()
  content?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiPropertyOptional()
  linkUrl?: string | null;

  @ApiPropertyOptional()
  linkText?: string | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  startDate?: Date | null;

  @ApiPropertyOptional()
  endDate?: Date | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
