import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedTestData(prisma: PrismaClient): Promise<void> {
  const hashedPassword = await bcrypt.hash('Test@123', 12);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      password: hashedPassword,
      name: 'Test Customer',
      role: 'CUSTOMER',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Test Admin',
      role: 'ADMIN',
    },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: 'test-brand' },
    update: {},
    create: {
      name: 'Test Brand',
      slug: 'test-brand',
      description: 'Test brand for integration tests',
    },
  });

  const category = await prisma.category.upsert({
    where: { id: 'test-category' },
    update: {},
    create: {
      id: 'test-category',
      name: 'Test Category',
      slug: 'test-category',
    },
  });

  const product = await prisma.product.upsert({
    where: { slug: 'test-product' },
    update: {},
    create: {
      name: 'Test Product',
      slug: 'test-product',
      description: 'Test product for integration tests',
      basePrice: 1000,
      compareAtPrice: 1200,
      categoryId: category.id,
      brandId: brand.id,
      tags: ['test'],
      metadata: {},
    },
  });

  const variant = await prisma.productVariant.upsert({
    where: { id: 'test-variant' },
    update: {},
    create: {
      id: 'test-variant',
      productId: product.id,
      sku: 'TEST-SKU-001',
      size: 'M',
      color: 'Black',
      price: 1000,
      stock: 50,
    },
  });

  const store = await prisma.store.upsert({
    where: { code: 'TEST' },
    update: {},
    create: {
      name: 'Test Store',
      code: 'TEST',
      address: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      phone: '1234567890',
      email: 'store@test.com',
    },
  });

  return { customer, adminUser, brand, category, product, variant, store };
}
