import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateSizeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
