import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateLockDto {
  @IsString()
  variantId!: string;

  @IsString()
  storeId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  orderId?: string;
}
