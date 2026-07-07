import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export class CreateNotificationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: NotificationChannel, example: 'EMAIL' })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiProperty({ example: 'Order Confirmed' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Your order #12345 has been confirmed.' })
  @IsString()
  body!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  dataJson?: Record<string, unknown>;
}
