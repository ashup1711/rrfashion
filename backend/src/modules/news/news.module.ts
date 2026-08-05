import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsPublicController } from './news-public.controller';
import { NewsService } from './news.service';

@Module({
  controllers: [NewsController, NewsPublicController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
