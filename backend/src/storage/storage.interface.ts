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

  /**
   * Returns a publicly accessible URL for the given key.
   * In production, this returns a CDN URL or image proxy URL.
   * In development, it may return a local URL.
   */
  getPublicUrl(key: string): string;

  /**
   * Generates a presigned URL for temporary access to a protected object.
   * @param key - The storage key of the object
   * @param expiresIn - Time in seconds until the URL expires (default: 3600)
   * @returns A signed URL string
   */
  getSignedUrl?(key: string, expiresIn?: number): Promise<string>;

  delete?(key: string): Promise<void>;
}
