import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix('api');

  // Parse cookies from request headers
  app.use(cookieParser());

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://rrfashion.com',
        'https://admin.rrfashion.com',
        'https://ashup1711.github.io',
        'http://localhost:5173',
        'http://localhost:3000',
      ];

      // Support env-configured origins (e.g., ngrok domain)
      if (process.env.CORS_ORIGINS) {
        const envOrigins = process.env.CORS_ORIGINS.split(',').map((o) => o.trim());
        allowedOrigins.push(...envOrigins);
      }

      // Allow requests with no origin (server-to-server, mobile apps)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list, or allow all in development
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  // ── Security Headers with explicit CSP ──────────────────────────────
  // REQ-BE-002: Strengthen Helmet CSP with strict directives + reporting
  // REQ-BE-004: Add security audit headers
  const isProduction = process.env.NODE_ENV === 'production';
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

  // Add Permissions-Policy header (not available in Helmet 7 directly)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    );
    next();
  });

  // REQ-BE-006: Request body size limiting
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
    }),
    new SanitizePipe(),
  );

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());

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

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`RR FASHION API running on: http://localhost:${port}/api`);
}

bootstrap();
