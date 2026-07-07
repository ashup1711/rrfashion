import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInquiryDto {
  @ApiProperty({ enum: ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], required: false })
  @IsEnum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  @IsOptional()
  status?: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  assignedAdminId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}
