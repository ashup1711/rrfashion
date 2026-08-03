/**
 * REQ-BE-006 / REQ-BE-007: Returns feature module.
 *
 * Imports PaymentsModule so ReturnsService can call PaymentsService.refund
 * when an admin approves a request.
 */
import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { ReturnsController, AdminReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';

@Module({
  imports: [PaymentsModule],
  controllers: [ReturnsController, AdminReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
