import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { GuestModule } from '../guest/guest.module';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'notifications' }), GuestModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
