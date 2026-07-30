import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SiteRemindersService } from './site-reminders.service';

@ApiTags('Site Reminders (Public)')
@Controller('reminders')
export class SiteRemindersPublicController {
  constructor(private readonly siteRemindersService: SiteRemindersService) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Get all currently active site reminders' })
  async getActive() {
    return this.siteRemindersService.findActive();
  }
}
