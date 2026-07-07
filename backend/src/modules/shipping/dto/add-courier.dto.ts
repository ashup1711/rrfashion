import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCourierDto {
  @ApiProperty()
  @IsString()
  courierName: string;

  @ApiProperty()
  @IsString()
  awbNumber: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  trackingUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  receiptFileUrl?: string;
}
