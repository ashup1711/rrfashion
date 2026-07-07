import { Global, Module } from '@nestjs/common';
import { StoreAuthGuard } from './store-auth.guard';

@Global()
@Module({
  providers: [StoreAuthGuard],
  exports: [StoreAuthGuard],
})
export class StoreAuthModule {}
