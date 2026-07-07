import { IsString, IsOptional } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsString()
  gstin!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
