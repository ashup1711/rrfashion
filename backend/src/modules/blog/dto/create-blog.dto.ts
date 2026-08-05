import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogDto {
  @ApiProperty({ description: 'Blog post title' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'URL slug (auto-generated from title if omitted)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiProperty({ description: 'Short excerpt' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  excerpt: string;

  @ApiProperty({ description: 'Full content (HTML or markdown)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Featured image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Author name' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  author?: string;

  @ApiPropertyOptional({ description: 'Whether this post is published', default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Publish date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
