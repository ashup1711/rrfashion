import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { GuestSessionService } from './guest-session.service';
import { GuestStartResponseDto } from './dto/guest-start-response.dto';

@ApiTags('Guest')
@Controller('guest')
export class GuestController {
  constructor(private readonly guestSessionService: GuestSessionService) {}

  @Public()
  @Post('start')
  @ApiCommonResponse({
    summary: 'Start a guest session — returns JWT token for store API auth',
    status: 201,
    auth: false,
    type: GuestStartResponseDto,
  })
  async startGuest(): Promise<GuestStartResponseDto> {
    return this.guestSessionService.createWithToken();
  }
}
