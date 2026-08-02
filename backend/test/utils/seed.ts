import {
  PrismaClient,
  User,
  Brand,
  Category,
  Product,
  ProductVariant,
  StoreLocation,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface SeededTestData {
  customer: User;
  adminUser: User;
  brand: Brand;
  category: Category;
  product: Product;
  variant: ProductVariant;
  store: StoreLocation;
}

export async function seedTestData(prisma: PrismaClient): Promise<SeededTestData> {
  const hashedPassword = await bcrypt.hash('Test@123', 12);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      passwordHash: hashedPassword,
      firstName: 'Test',
      lastName: 'Customer',
      role: 'CUSTOMER',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash: hashedPassword,
      firstName: 'Test',
      lastName: 'Admin',
      role: 'ADMIN',
    },
  });

  const brand = await prisma.brand.upsert({
    where: { name: 'Test Brand' },
    update: {},
    create: {
      name: 'Test Brand',
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
      salePrice: 1200,
      categoryId: category.id,
      brandId: brand.id,
      tags: {
        create: [{ key: 'occasion', value: 'test' }],
      },
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
      salePrice: 1000,
    },
  });

  const store = await prisma.storeLocation.upsert({
    where: { id: 'test-store' },
    update: {},
    create: {
      id: 'test-store',
      name: 'Test Store',
      address: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      gstin: 'GSTTEST0001',
      phone: '1234567890',
    },
  });

  return { customer, adminUser, brand, category, product, variant, store };
}
