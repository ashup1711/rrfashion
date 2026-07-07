import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageInterface } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { STORAGE_INTERFACE_TOKEN } from './storage.constants';

const StorageFactoryProvider = {
  provide: STORAGE_INTERFACE_TOKEN,
  useFactory: (configService: ConfigService): StorageInterface => {
    const driver = configService.get<string>('storage.driver', 'local');
    if (driver === 's3') {
      return new S3StorageService(configService);
    }
    return new LocalStorageService(configService);
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [StorageFactoryProvider, StorageService],
  exports: [StorageService, STORAGE_INTERFACE_TOKEN],
})
export class StorageModule {}
