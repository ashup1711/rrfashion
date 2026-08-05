import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  excerpt: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiPropertyOptional()
  author?: string | null;

  @ApiProperty()
  isPublished: boolean;

  @ApiPropertyOptional()
  publishedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
