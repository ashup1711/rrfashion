import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { join } from 'path';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import { noStoreMiddleware } from './common/middleware/no-store.middleware';

const PRODUCTION_ORIGINS = [
  'https://rrfashion.com',
  'https://admin.rrfashion.com',
  'https://ashup1711.github.io',
];

// REQ-SEC-013 / SEC-02: explicit dev allow-list — never blanket-allow in dev.
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix('api');

  // Parse cookies from request headers
  app.use(cookieParser());

  // REQ-SEC-005: response compression (gzip) for API payloads above 1KB.
  // Never compress SSE/streaming responses; default filter skips already-compressed types.
  app.use(
    compression({
      threshold: 1024,
      filter: (req: Request, res: Response) => {
        if (req.headers['accept']?.includes('text/event-stream')) return false;
        return compression.filter(req, res);
      },
    }),
  );

  // REQ-SEC-010 / SEC-14: Cache-Control: no-store on authenticated/user-specific routes.
  app.use(noStoreMiddleware);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  // REQ-SEC-013 / SEC-02: CORS allow-list — production origins always enforced;
  // dev origins only when not production; CORS_ORIGINS env adds extra origins.
  const isProduction = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [...PRODUCTION_ORIGINS];
      if (!isProduction) allowedOrigins.push(...DEV_ORIGINS);
      if (process.env.CORS_ORIGINS) {
        const envOrigins = process.env.CORS_ORIGINS.split(',').map((o) => o.trim());
        allowedOrigins.push(...envOrigins);
      }

      // Allow requests with no origin (server-to-server, mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  // ── Security Headers with explicit CSP ──────────────────────────────
  // REQ-BE-002: Strengthen Helmet CSP with strict directives + reporting
  // REQ-BE-004: Add security audit headers
  // REQ-SEC-006 / SEC-01: keep scriptSrc 'unsafe-inline' — the frontend
  // index.html inline loading spinner + Vite preload hints require it (documented
  // tradeoff in research report pitfalls #1). CSP is disabled in dev so Vite HMR works.
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
              connectSrc: ["'self'", 'https://api.rrfashion.com', 'https://rrfashion.com'],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              upgradeInsecureRequests: [],
              reportUri: '/api/csp-report',
            },
            reportOnly: !isProduction,
          }
        : false,
      hsts: isProduction
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,
      frameguard: { action: 'deny' },
      noSniff: true, // X-Content-Type-Options: nosniff
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      xssFilter: true,
      hidePoweredBy: true, // Remove X-Powered-By
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    }),
  );
  app.disable('x-powered-by'); // SEC-01: remove framework fingerprinting

  // Add Permissions-Policy header (not available in Helmet 7 directly)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    );
    next();
  });

  // REQ-BE-006 / REQ-SEC-011: Request body size limiting (documented via BODY_LIMIT_JSON)
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  // REQ-BE-001: Fix static asset serving for SPA fallback
  // The app uses HashRouter, so SPA fallback is handled by the frontend.
  // We serve the frontend build directory if it exists.
  // This ensures the backend doesn't break on route requests.
  app.useStaticAssets(join(__dirname, '..', '..', 'frontend', 'dist'), {
    index: 'index.html',
    redirect: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true, // REQ-SEC-008 / SEC-07
    }),
    new SanitizePipe(),
  );

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());

  // REQ-SEC-009 / SEC-13: Swagger UI is disabled in production unless explicitly
  // enabled via SWAGGER_ENABLED=true — prevents API inventory exposure.
  const swaggerEnabled = !isProduction || process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('RR FASHION API')
      .setDescription('API documentation for RR FASHION online fashion store')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const options: SwaggerDocumentOptions = {
      deepScanRoutes: true,
    };

    const document = SwaggerModule.createDocument(app, config, options);
    SwaggerModule.setup('docs', app, document);
  }

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`RR FASHION API running on: http://localhost:${port}/api`);
}

bootstrap();
