import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
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
      await fsp.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Upload directory ensured at ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`Failed to create upload directory at ${this.uploadDir}`, error);
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);

    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(filePath, body);

    this.logger.log(`Uploaded ${key} to local filesystem (${filePath})`);
    void contentType;
    return key;
  }

  async uploadStream(
    key: string,
    stream: Readable,
    contentType: string,
    contentLength?: number,
  ): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);

    await fsp.mkdir(dir, { recursive: true });

    const writeStream = fs.createWriteStream(filePath);
    try {
      await pipeline(stream, writeStream);
      this.logger.log(`Streamed ${key} to local filesystem (${filePath})`);
      void contentType;
      void contentLength;
      return key;
    } catch (error) {
      this.logger.error(`Failed to stream ${key}`, error);
      // Clean up partial file on error
      await fsp.unlink(filePath).catch(() => {});
      throw error;
    }
  }

  async uploadFile(key: string, filePath: string, contentType: string): Promise<string> {
    const stat = await fsp.stat(filePath);
    const readStream = fs.createReadStream(filePath);
    return this.uploadStream(key, readStream, contentType, stat.size);
  }

  async download(key: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.uploadDir, key);
      return await fsp.readFile(filePath);
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
      await fsp.unlink(filePath);
      this.logger.log(`Deleted ${key} from local filesystem`);
    } catch (error) {
      this.logger.error(`Failed to delete ${key}`, error);
    }
  }
}
