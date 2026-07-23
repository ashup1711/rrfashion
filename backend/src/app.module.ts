import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { BullQueueModule } from './bull/bull.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { RolesPermissionsModule } from './modules/roles-permissions/roles-permissions.module';
import { BrandsModule } from './modules/brands/brands.module';
import { VariantsModule } from './modules/variants/variants.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { StoresModule } from './modules/stores/stores.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RentalsModule } from './modules/rentals/rentals.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PosModule } from './modules/pos/pos.module';
import { CartModule } from './modules/cart/cart.module';
import { GuestModule } from './modules/guest/guest.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { ImageUploadModule } from './modules/upload/image-upload.module';
import { JwtStrategy } from './common/strategies/jwt.strategy';
import { AdminJwtStrategy } from './common/strategies/admin-jwt.strategy';
import { ThrottlerProxyGuard } from './common/guards/throttler-proxy.guard';
import { RedisThrottlerStorage } from './common/providers/redis-throttler-storage.service';
import { StoreAuthModule } from './common/guards/store-auth.module';
import { envConfig } from './config/env.config';
import { databaseConfig } from './config/database.config';
import { authConfig } from './config/auth.config';
import { redisConfig } from './config/redis.config';
import { storageConfig } from './config/storage.config';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig, databaseConfig, authConfig, redisConfig, storageConfig],
    }),
    ScheduleModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (
        config: ConfigService,
        storage: RedisThrottlerStorage,
      ): ThrottlerModuleOptions => ({
        throttlers: [
          {
            name: 'general',
            ttl: 60000,
            limit: config.get<number>('RATE_LIMIT_GENERAL', 120),
            skipIf: (context) => {
              const request = context.switchToHttp().getRequest();
              return (
                request.url?.startsWith('/api/health') || request.url?.startsWith('/api/metrics')
              );
            },
          },
          {
            name: 'auth',
            ttl: 60000,
            limit: config.get<number>('RATE_LIMIT_AUTH', 10),
            skipIf: (context) => {
              const request = context.switchToHttp().getRequest();
              const isAuth =
                request.url?.startsWith('/api/auth/') ||
                request.url?.startsWith('/api/admin/auth/');
              return !isAuth;
            },
          },
          {
            name: 'upload',
            ttl: 60000,
            limit: config.get<number>('RATE_LIMIT_UPLOAD', 20),
            skipIf: (context) => {
              const request = context.switchToHttp().getRequest();
              const isUpload =
                request.url?.startsWith('/api/upload') ||
                request.url?.startsWith('/api/profile/photo');
              return !isUpload;
            },
          },
          {
            name: 'otp',
            ttl: 300,
            limit: 5,
          },
        ],
        storage,
        errorMessage: 'Too many requests — please try again later',
      }),
    }),
    PrismaModule,
    RedisModule,
    BullQueueModule,
    StorageModule,
    AuthModule,
    AdminAuthModule,
    AdminUsersModule,
    RolesPermissionsModule,
    BrandsModule,
    VariantsModule,
    ProductsModule,
    CategoriesModule,
    StoresModule,
    InventoryModule,
    AuditLogsModule,
    UsersModule,
    OrdersModule,
    PaymentsModule,
    RentalsModule,
    InvoicesModule,
    ShippingModule,
    CouponsModule,
    InquiriesModule,
    WishlistModule,
    WalletModule,
    AnalyticsModule,
    PosModule,
    ReviewsModule,
    CartModule,
    UploadsModule,
    HealthModule,
    MetricsModule,
    NotificationsModule,
    RemindersModule,
    AddressesModule,
    GuestModule,
    ImageUploadModule,
    StoreAuthModule,
  ],
  providers: [
    JwtStrategy,
    AdminJwtStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerProxyGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
