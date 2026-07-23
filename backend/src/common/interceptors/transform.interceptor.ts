import { Injectable, NestInterceptor, ExecutionContext, CallHandler, SetMetadata } from '@nestjs/common';
import { Observable, isObservable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export const SKIP_TRANSFORM = 'skip_transform';
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM, true);

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const skip = this.reflector.get<boolean>(SKIP_TRANSFORM, context.getHandler());
    if (skip) return next.handle();

    const response = context.switchToHttp().getResponse();
    if (response.getHeader('Content-Type')?.includes('text/event-stream')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) return data;
        if (isObservable(data)) return data;
        return {
          success: true as const,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
