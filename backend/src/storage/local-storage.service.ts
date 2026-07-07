import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageInterface } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageInterface {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get<string>('storage.uploadDir', './uploads');
    void this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Upload directory ensured at ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`Failed to create upload directory at ${this.uploadDir}`, error);
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, body);

    this.logger.log(`Uploaded ${key} to local filesystem (${filePath})`);
    void contentType;
    return key;
  }

  async download(key: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.uploadDir, key);
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(`Failed to download ${key}`, error);
      return null;
    }
  }

  getPublicUrl(key: string): string {
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, key);
      await fs.unlink(filePath);
      this.logger.log(`Deleted ${key} from local filesystem`);
    } catch (error) {
      this.logger.error(`Failed to delete ${key}`, error);
    }
  }
}
