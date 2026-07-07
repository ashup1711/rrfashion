import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>[];
  };
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    let message = exception.message;
    let details: Record<string, unknown>[] | undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, unknown>;
      if (Array.isArray(resp.message)) {
        message = (resp.message as string[]).join('; ');
        details = (resp.message as string[]).map((msg: string) => ({
          issue: msg,
        }));
      } else if (typeof resp.message === 'string') {
        message = resp.message;
      }
    }

    // Build error code from status
    const errorCode = this.getErrorCode(status, message);

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
    };

    // Log the error
    // eslint-disable-next-line no-console
    console.error(`[${request.method} ${request.url}] ${status} - ${message}`);

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number, message: string): string {
    if (status === 400) return 'VALIDATION_ERROR';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) {
      if (message.toLowerCase().includes('email')) return 'EMAIL_EXISTS';
      if (message.toLowerCase().includes('sku')) return 'SKU_EXISTS';
      if (message.toLowerCase().includes('lock')) return 'ITEM_LOCKED';
      if (message.toLowerCase().includes('signature')) return 'INVALID_SIGNATURE';
      if (message.toLowerCase().includes('payment')) return 'PAYMENT_ERROR';
      return 'CONFLICT';
    }
    if (status === 429) return 'RATE_LIMIT_EXCEEDED';
    return 'INTERNAL_ERROR';
  }
}
