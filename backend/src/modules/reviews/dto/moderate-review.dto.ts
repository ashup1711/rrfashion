import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ModerateReviewAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ModerateReviewDto {
  @ApiProperty({ enum: ModerateReviewAction, example: 'APPROVED' })
  @IsEnum(ModerateReviewAction)
  status!: ModerateReviewAction;

  @ApiProperty({ required: false, example: 'Inappropriate content' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
