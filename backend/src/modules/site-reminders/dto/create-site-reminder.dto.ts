import { IsString, IsOptional, IsDateString, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSiteReminderDto {
  @ApiProperty({ description: 'Reminder title (e.g. "Summer Sale!")' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Reminder message body' })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message: string;

  @ApiProperty({ description: 'Optional link URL', required: false })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Whether the reminder is active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
