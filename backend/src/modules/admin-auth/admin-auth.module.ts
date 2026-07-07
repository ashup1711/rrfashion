import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAuthController } from './admin-auth.controller';
import { AdminSessionsController } from './admin-sessions.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtStrategy } from '../../common/strategies/admin-jwt.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtAdminSecret', 'rr-fashion-admin-jwt-secret-dev'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtAdminExpiresIn', '15m'),
        },
      }),
    }),
  ],
  controllers: [AdminAuthController, AdminSessionsController],
  providers: [AdminAuthService, AdminJwtStrategy],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
