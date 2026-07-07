import { Injectable, Logger } from '@nestjs/common';

export interface SmsOptions {
  to: string;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async send(options: SmsOptions): Promise<boolean> {
    // STUB: Replace with real SMS provider (Twilio, MSG91, etc.)
    this.logger.log(`[SMS STUB] To: ${options.to}, Message: ${options.message}`);
    return true;
  }
}
