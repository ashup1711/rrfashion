import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class MutationItem {
  @IsString()
  clientUuid!: string;

  @IsString()
  entity!: string;

  @IsString()
  operation!: string;

  data!: Record<string, unknown>;
}

export class SyncMutationDto {
  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MutationItem)
  mutations!: MutationItem[];
}
