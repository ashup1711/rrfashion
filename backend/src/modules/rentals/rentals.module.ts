import { Module } from '@nestjs/common';
import { RentalsController } from './rentals.controller';
import { AdminRentalsController } from './admin-rentals.controller';
import { RentalsService } from './rentals.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [RentalsController, AdminRentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
