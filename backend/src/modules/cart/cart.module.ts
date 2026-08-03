import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { GuestModule } from '../guest/guest.module';
import {
  CartAbandonmentProcessor,
  CART_ABANDONMENT_QUEUE,
} from './processors/cart-abandonment.processor';

@Module({
  imports: [
    GuestModule,
    // REQ-BE-004: BullMQ queue hosting the repeatable cart-abandonment-scan job.
    BullModule.registerQueue({ name: CART_ABANDONMENT_QUEUE }),
  ],
  controllers: [CartController],
  providers: [CartService, CartAbandonmentProcessor],
  exports: [CartService],
})
export class CartModule {}
