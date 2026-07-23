import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GuestController } from './guest.controller';
import { GuestSessionService } from './guest-session.service';
import { GuestAddressService } from './guest-address.service';

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
  ],
  controllers: [GuestController],
  providers: [GuestSessionService, GuestAddressService],
  exports: [GuestSessionService, GuestAddressService],
})
export class GuestModule {}
