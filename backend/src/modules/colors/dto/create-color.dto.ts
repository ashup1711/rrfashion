import { IsString, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';

export class CreateColorDto {
  @IsString()
  name!: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'hexCode must be a valid 6-character hex color (e.g. #FF0000)',
  })
  hexCode!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
