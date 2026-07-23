import { Injectable, Inject, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { StorageInterface } from './storage.interface';
import { STORAGE_INTERFACE_TOKEN } from './storage.constants';

@Injectable()
export class StorageService implements StorageInterface {
  private readonly logger = new Logger(StorageService.name);

  constructor(@Inject(STORAGE_INTERFACE_TOKEN) private readonly delegate: StorageInterface) {
    this.logger.log('StorageService initialized with factory-provided delegate');
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    return this.delegate.upload(key, body, contentType);
  }

  async uploadStream(
    key: string,
    stream: Readable,
    contentType: string,
    contentLength?: number,
  ): Promise<string> {
    return this.delegate.uploadStream(key, stream, contentType, contentLength);
  }

  async uploadFile(key: string, filePath: string, contentType: string): Promise<string> {
    return this.delegate.uploadFile(key, filePath, contentType);
  }

  async download(key: string): Promise<Buffer | null> {
    return this.delegate.download(key);
  }

  getPublicUrl(key: string): string {
    return this.delegate.getPublicUrl(key);
  }

  async delete(key: string): Promise<void> {
    if (this.delegate.delete) {
      await this.delegate.delete(key);
    }
  }
}
