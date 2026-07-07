import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { startContainers, stopContainers, TestContainers } from './utils/containers';
import { runMigrations } from './utils/migrations';
import { seedTestData } from './utils/seed';

describe('RR FASHION API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let containers: TestContainers;

  beforeAll(async () => {
    containers = await startContainers();
    runMigrations();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await seedTestData(prisma);
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await stopContainers(containers);
  }, 30_000);

  describe('Health', () => {
    it('GET /api/health returns ok', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
        });
    });
  });

  describe('Categories', () => {
    it('GET /api/categories returns list', () => {
      return request(app.getHttpServer())
        .get('/api/categories')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('name');
          expect(res.body[0]).toHaveProperty('slug');
        });
    });
  });

  describe('Brands', () => {
    it('GET /api/brands returns list', () => {
      return request(app.getHttpServer())
        .get('/api/brands')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('Products', () => {
    let productId: string;

    it('GET /api/products returns list', () => {
      return request(app.getHttpServer())
        .get('/api/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          productId = res.body[0].id;
        });
    });

    it('GET /api/products/:id returns single product', () => {
      return request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', productId);
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('variants');
        });
    });

    it('GET /api/products?category= filters correctly', () => {
      return request(app.getHttpServer())
        .get('/api/products?category=test-category')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /api/products/:id/variants returns variants', () => {
      return request(app.getHttpServer())
        .get(`/api/products/${productId}/variants`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Auth', () => {
    let accessToken: string;
    let refreshToken: string;

    it('POST /api/auth/register creates a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'newuser@test.com', password: 'StrongPass1!', name: 'New User' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('POST /api/auth/register rejects duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'newuser@test.com', password: 'StrongPass1!', name: 'New User' })
        .expect(409);
    });

    it('POST /api/auth/login succeeds with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'newuser@test.com', password: 'StrongPass1!' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          accessToken = res.body.accessToken;
        });
    });

    it('POST /api/auth/login fails with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'newuser@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('GET /api/auth/me returns authenticated user', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email', 'newuser@test.com');
        });
    });

    it('GET /api/auth/me rejects unauthenticated request', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('POST /api/auth/refresh returns new tokens', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('POST /api/auth/logout invalidates refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Cart', () => {
    let authToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'customer@test.com', password: 'Test@123' });
      authToken = res.body.accessToken;
    });

    it('POST /api/cart/add adds item to cart', () => {
      return request(app.getHttpServer())
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ variantId: 'test-variant', quantity: 2 })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
        });
    });

    it('GET /api/cart returns cart', () => {
      return request(app.getHttpServer())
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
        });
    });
  });

  describe('Wishlist', () => {
    let authToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'customer@test.com', password: 'Test@123' });
      authToken = res.body.accessToken;
    });

    it('POST /api/wishlist adds product to wishlist', () => {
      return request(app.getHttpServer())
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ variantId: 'test-variant' })
        .expect(201);
    });

    it('GET /api/wishlist returns wishlist items', () => {
      return request(app.getHttpServer())
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Stores', () => {
    it('GET /api/stores returns list', () => {
      return request(app.getHttpServer())
        .get('/api/stores')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('Input Validation', () => {
    it('POST /api/auth/register rejects missing fields', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'bad@test.com' })
        .expect(400);
    });

    it('POST /api/auth/register rejects invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'StrongPass1!', name: 'Test' })
        .expect(400);
    });

    it('POST /api/auth/register rejects weak password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'weak@test.com', password: '123', name: 'Test' })
        .expect(400);
    });
  });
});
