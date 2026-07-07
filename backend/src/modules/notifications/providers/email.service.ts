import { Injectable, Logger } from '@nestjs/common';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(options: EmailOptions): Promise<boolean> {
    // STUB: Replace with real email provider (SendGrid, AWS SES, etc.)
    this.logger.log(
      `[EMAIL STUB] To: ${options.to}, Subject: ${options.subject}, Body: ${options.body}`,
    );
    return true;
  }
}
