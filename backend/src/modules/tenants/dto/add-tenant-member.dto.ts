import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class AddTenantMemberDto {
  @ApiProperty({ example: 'staff@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ enum: TenantRole, default: TenantRole.STAFF })
  @IsOptional()
  @IsEnum(TenantRole)
  role?: TenantRole;
}
