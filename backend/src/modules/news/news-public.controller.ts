import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { NewsService } from './news.service';

@ApiTags('News (Public)')
@Controller('news')
export class NewsPublicController {
  constructor(private readonly newsService: NewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all currently active news items' })
  async findActive() {
    return this.newsService.findActive();
  }
}
