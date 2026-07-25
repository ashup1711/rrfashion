import { Injectable, PipeTransform } from '@nestjs/common';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Recursively sanitizes string inputs against XSS using DOMPurify.
 * Strips malicious HTML tags, event handlers, javascript: URLs, etc.
 *
 * Apply globally in main.ts via:
 *   app.useGlobalPipes(new SanitizePipe());
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(value: any): any {
    if (typeof value === 'string') {
      // DOMPurify strips malicious HTML but preserves safe content
      // ALLOWED_TAGS: [] means we strip ALL HTML tags from user input
      return DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [], // We don't allow ANY HTML in user input
        ALLOWED_ATTR: [], // Strip all attributes
        ALLOW_DATA_ATTR: false,
      });
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item));
    }

    if (typeof value === 'object' && value !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.transform(val);
      }
      return sanitized;
    }

    return value;
  }
}
