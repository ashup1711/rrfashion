import { IsString, IsEmail, IsOptional, IsArray, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  roleId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  storeIds?: string[];
}
