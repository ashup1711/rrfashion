import { Readable } from 'stream';

export interface StorageInterface {
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
  uploadStream(
    key: string,
    stream: Readable,
    contentType: string,
    contentLength?: number,
  ): Promise<string>;
  uploadFile(key: string, filePath: string, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer | null>;
  getPublicUrl(key: string): string;
  delete?(key: string): Promise<void>;
}
