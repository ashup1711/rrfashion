import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CartModule } from '../cart/cart.module';
import { WishlistModule } from '../wishlist/wishlist.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../../redis/redis.module';
import { HibpService } from '../../common/security/hibp.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret', 'rr-fashion-jwt-secret-dev'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtExpiresIn', '15m'),
        },
      }),
    }),
    CartModule,
    WishlistModule,
    NotificationsModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, HibpService],
  exports: [AuthService, JwtModule, HibpService],
})
export class AuthModule {}
