import { Injectable, PipeTransform } from '@nestjs/common';

/**
 * Recursively strips HTML tags from string inputs.
 *
 * Apply globally in main.ts via:
 *   app.useGlobalPipes(new SanitizePipe());
 * or per-controller via:
 *   @UsePipes(new SanitizePipe())
 *
 * For production, consider using `isomorphic-dompurify` for more robust sanitization.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(value: any): any {
    if (typeof value === 'string') {
      return value.replace(/<[^>]*>/g, '');
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
