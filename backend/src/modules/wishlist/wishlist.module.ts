import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { GuestModule } from '../guest/guest.module';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [CartModule, GuestModule],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
