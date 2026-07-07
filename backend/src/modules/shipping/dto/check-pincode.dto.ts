import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckPincodeDto {
  @ApiProperty()
  @IsString()
  pincode: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  storeId?: string;
}
