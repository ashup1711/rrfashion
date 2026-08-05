import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  MinLength,
  MaxLength,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNewsDto {
  @ApiProperty({ description: 'News title' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Short excerpt' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  excerpt: string;

  @ApiPropertyOptional({ description: 'Full content (HTML or markdown)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Link URL' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ description: 'Link text' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  linkText?: string;

  @ApiPropertyOptional({ description: 'Category (e.g. announcement, sale, update)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ description: 'Whether this news item is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Sort order (ascending)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
