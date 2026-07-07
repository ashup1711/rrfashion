import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ExportProcessor } from './processors/export.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'report-export',
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ExportProcessor],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
