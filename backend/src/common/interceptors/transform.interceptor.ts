import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
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

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> | Promise<Observable<ApiSuccessResponse<T>>> {
    const skip = this.reflector.get<boolean>(SKIP_TRANSFORM, context.getHandler());
    if (skip) return next.handle() as Observable<ApiSuccessResponse<T>>;

    const response = context.switchToHttp().getResponse();
    if (response.getHeader('Content-Type')?.includes('text/event-stream')) {
      return next.handle() as Observable<ApiSuccessResponse<T>>;
    }

    return next.handle().pipe(
      map((data): ApiSuccessResponse<T> => {
        if (data === null || data === undefined) {
          // Pass-through of nullish payloads (e.g. 204-style handlers); cast is
          // safe because the value is returned unchanged.
          return data as unknown as ApiSuccessResponse<T>;
        }
        if (isObservable(data)) {
          return data as unknown as ApiSuccessResponse<T>;
        }
        return {
          success: true as const,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
