import { IsString, IsOptional } from 'class-validator';

export class GetInventoryDto {
  @IsString()
  storeId!: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
