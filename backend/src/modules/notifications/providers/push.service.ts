import { Injectable, Logger } from '@nestjs/common';

export interface PushOptions {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async send(options: PushOptions): Promise<boolean> {
    // STUB: Replace with real push provider (Firebase Cloud Messaging, etc.)
    this.logger.log(
      `[PUSH STUB] Token: ${options.deviceToken}, Title: ${options.title}, Body: ${options.body}`,
    );
    return true;
  }
}
