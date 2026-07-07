export interface StorageInterface {
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer | null>;
  getPublicUrl(key: string): string;
  delete?(key: string): Promise<void>;
}
