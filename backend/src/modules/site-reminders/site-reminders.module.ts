import { Module } from '@nestjs/common';
import { SiteRemindersController } from './site-reminders.controller';
import { SiteRemindersPublicController } from './site-reminders-public.controller';
import { SiteRemindersService } from './site-reminders.service';

@Module({
  controllers: [SiteRemindersController, SiteRemindersPublicController],
  providers: [SiteRemindersService],
  exports: [SiteRemindersService],
})
export class SiteRemindersModule {}
