import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';
import { Request } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const route = req.route?.path || req.path;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - start) / 1000;
          const res = context.switchToHttp().getResponse();
          const status = String(res.statusCode);

          this.metrics.httpRequestsTotal.labels(method, route, status).inc();
          this.metrics.httpRequestDuration.labels(method, route, status).observe(duration);
        },
        error: () => {
          const duration = (Date.now() - start) / 1000;
          this.metrics.httpRequestsTotal.labels(method, route, '5xx').inc();
          this.metrics.httpRequestDuration.labels(method, route, '5xx').observe(duration);
        },
      }),
    );
  }
}
