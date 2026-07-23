import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { StorageInterface } from './storage.interface';
import { Readable } from 'stream';
import * as fs from 'fs';

@Injectable()
export class S3StorageService implements StorageInterface {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly port: number;
  private readonly useSSL: boolean;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('storage.endpoint');
    const port = this.config.get<number>('storage.port');
    const accessKey = this.config.get<string>('storage.accessKey');
    const secretKey = this.config.get<string>('storage.secretKey');
    const useSSL = this.config.get<boolean>('storage.useSSL');
    const region = this.config.get<string>('storage.region');

    this.endpoint = endpoint || 'localhost';
    this.port = port || 9000;
    this.useSSL = useSSL || false;
    this.bucket = this.config.get<string>('storage.bucket') || 'rrfashion';

    this.client = new S3Client({
      endpoint: `${this.useSSL ? 'https' : 'http'}://${this.endpoint}:${this.port}`,
      region: region || 'ap-south-1',
      credentials: {
        accessKeyId: accessKey || 'minioadmin',
        secretAccessKey: secretKey || 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      this.logger.log(`Uploaded ${key} to ${this.bucket}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload ${key}`, error);
      throw error;
    }
  }

  async uploadStream(
    key: string,
    stream: Readable,
    contentType: string,
    contentLength?: number,
  ): Promise<string> {
    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: stream,
          ContentType: contentType,
          ...(contentLength !== undefined && { ContentLength: contentLength }),
        },
      });

      upload.on('httpUploadProgress', (progress) => {
        this.logger.debug(`S3 upload progress: ${progress.loaded}/${progress.total}`);
      });

      await upload.done();
      this.logger.log(`Streamed ${key} to ${this.bucket}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to stream ${key}`, error);
      throw error;
    }
  }

  async uploadFile(key: string, filePath: string, contentType: string): Promise<string> {
    const stat = await fs.promises.stat(filePath);
    const stream = fs.createReadStream(filePath);
    return this.uploadStream(key, stream, contentType, stat.size);
  }

  async download(key: string): Promise<Buffer | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return Buffer.from(await result.Body!.transformToByteArray());
    } catch (error) {
      this.logger.error(`Failed to download ${key}`, error);
      return null;
    }
  }

  getPublicUrl(key: string): string {
    const protocol = this.useSSL ? 'https' : 'http';
    return `${protocol}://${this.endpoint}:${this.port}/${this.bucket}/${key}`;
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`Deleted ${key} from ${this.bucket}`);
    } catch (error) {
      this.logger.error(`Failed to delete ${key}`, error);
    }
  }
}
