import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchAnalyticsQueryDto {
  @ApiProperty({ description: 'ISO start date (inclusive)', required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ description: 'ISO end date (inclusive)', required: false })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ description: 'Top-N popular/zero-result queries to return', required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  top?: number = 20;
}

export interface SearchAnalyticsResult {
  totalSearches: number;
  uniqueQueries: number;
  zeroResultSearches: number;
  zeroResultRate: number;
  topQueries: Array<{ query: string; count: number; avgResults: number }>;
  zeroResultQueries: Array<{ query: string; count: number }>;
  from: string | null;
  to: string | null;
}
