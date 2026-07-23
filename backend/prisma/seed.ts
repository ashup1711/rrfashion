// ─────────────────────────────────────────────────────────
//  RR FASHION — Database Seed Script (Phase 1)
//  Creates: permissions, roles, admin users, store, brands,
//           categories, products, variants, inventory,
//           sample customer, feature flags
// ─────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// ── Permission Definitions ─────────────────────────────

const MODULES = [
  'products',
  'orders',
  'customers',
  'inventory',
  'roles',
  'admin_users',
  'stores',
  'brands',
  'categories',
  'reviews',
  'reports',
  'settings',
] as const;

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export'] as const;

function allPermissionCombinations(): Array<{ module: string; action: string; description: string }> {
  const result: Array<{ module: string; action: string; description: string }> = [];
  for (const mod of MODULES) {
    for (const act of ACTIONS) {
      result.push({
        module: mod,
        action: act,
        description: `Can ${act} ${mod}`,
      });
    }
  }
  return result;
}

// ── Main Seed Function ─────────────────────────────────

async function main() {
  console.log('🌱  Seeding database for R R Fashion Phase 1 …\n');

  // ── 1. Permissions ─────────────────────────────────
  console.log('  Creating permissions …');
  const permissions = allPermissionCombinations();
  const createdPermissions: Array<{ id: string; module: string; action: string }> = [];

  for (const perm of permissions) {
    const created = await prisma.permission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: { description: perm.description },
      create: {
        module: perm.module,
        action: perm.action,
        description: perm.description,
      },
    });
    createdPermissions.push({ id: created.id, module: created.module, action: created.action });
  }
  console.log(`  ✔  ${createdPermissions.length} permissions created`);

  // Build lookup: module_action → id
  const permIdByKey = new Map<string, string>();
  for (const p of createdPermissions) {
    permIdByKey.set(`${p.module}:${p.action}`, p.id);
  }

  function permIdsFor(moduleActions: string[]): string[] {
    const ids: string[] = [];
    for (const ma of moduleActions) {
      const id = permIdByKey.get(ma);
      if (id) ids.push(id);
    }
    return ids;
  }

  // ── 2. Roles ───────────────────────────────────────
  console.log('  Creating roles …');

  // Super Admin — gets ALL permissions
  const superAdminRole = await prisma.roleModel.upsert({
    where: { name: 'Super Admin' },
    update: { description: 'Full system access. Cannot be deleted.' },
    create: {
      name: 'Super Admin',
      description: 'Full system access. Cannot be deleted.',
      isSystem: true,
    },
  });

  // Assign all permissions to Super Admin
  const allPermIds = createdPermissions.map((p) => p.id);
  // Clear then set
  await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPermIds.map((permissionId) => ({
      roleId: superAdminRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
  console.log(`  ✔  Super Admin role created with ${allPermIds.length} permissions`);

  // Store Manager — products/orders/customers/inventory/stores/brands/categories/reviews
  const storeManagerRole = await prisma.roleModel.upsert({
    where: { name: 'Store Manager' },
    update: { description: 'Manages day-to-day store operations.' },
    create: {
      name: 'Store Manager',
      description: 'Manages day-to-day store operations.',
      isSystem: false,
    },
  });

  const storeManagerPerms = permIdsFor([
    'products:view', 'products:create', 'products:edit',
    'orders:view', 'orders:create', 'orders:edit',
    'customers:view',
    'inventory:view', 'inventory:create', 'inventory:edit',
    'stores:view',
    'brands:view', 'brands:create', 'brands:edit',
    'categories:view', 'categories:create', 'categories:edit',
    'reviews:view', 'reviews:edit',
  ]);

  await prisma.rolePermission.deleteMany({ where: { roleId: storeManagerRole.id } });
  await prisma.rolePermission.createMany({
    data: storeManagerPerms.map((permissionId) => ({
      roleId: storeManagerRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
  console.log(`  ✔  Store Manager role created with ${storeManagerPerms.length} permissions`);

  // Inventory Staff — inventory + products view
  const inventoryStaffRole = await prisma.roleModel.upsert({
    where: { name: 'Inventory Staff' },
    update: { description: 'Manages inventory and stock.' },
    create: {
      name: 'Inventory Staff',
      description: 'Manages inventory and stock.',
      isSystem: false,
    },
  });

  const inventoryStaffPerms = permIdsFor([
    'inventory:view', 'inventory:create', 'inventory:edit',
    'products:view',
    'stores:view',
  ]);

  await prisma.rolePermission.deleteMany({ where: { roleId: inventoryStaffRole.id } });
  await prisma.rolePermission.createMany({
    data: inventoryStaffPerms.map((permissionId) => ({
      roleId: inventoryStaffRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
  console.log(`  ✔  Inventory Staff role created with ${inventoryStaffPerms.length} permissions`);

  // ── 3. Default Store Location ─────────────────────
  console.log('  Creating default store …');
  const mainStore = await prisma.storeLocation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {
      name: 'RR Fashion — Main Store',
      address: 'Shop No. 5, City Market',
      city: 'Surat',
      state: 'Gujarat',
      pincode: '395003',
      gstin: '24ABCDE1234F1Z5',
      phone: '+919876543210',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'RR Fashion — Main Store',
      address: 'Shop No. 5, City Market',
      city: 'Surat',
      state: 'Gujarat',
      pincode: '395003',
      gstin: '24ABCDE1234F1Z5',
      phone: '+919876543210',
      isActive: true,
    },
  });
  console.log(`  ✔  Store: ${mainStore.name} (GSTIN: ${mainStore.gstin})`);

  // ── 4. Brands ─────────────────────────────────────
  console.log('  Creating brands …');
  const brandData = [
    { name: 'FabIndia', description: 'Handcrafted Indian clothing and home decor.' },
    { name: 'Biba', description: 'Contemporary Indian ethnic wear for women.' },
    { name: 'Manyavar', description: 'Indian wedding and festive wear for men.' },
    { name: 'W', description: 'Trendy womenswear — kurtis, dresses, and more.' },
    { name: 'Allen Solly', description: 'Smart casual and formal menswear.' },
    { name: "Levi's", description: 'Iconic denim and casual apparel.' },
  ];

  const brands = new Map<string, { id: string; name: string }>();
  for (const b of brandData) {
    const brand = await prisma.brand.upsert({
      where: { name: b.name },
      update: { description: b.description },
      create: {
        name: b.name,
        description: b.description,
        isActive: true,
      },
    });
    brands.set(brand.name, { id: brand.id, name: brand.name });
  }
  console.log(`  ✔  ${brands.size} brands created`);

  // ── 5. Categories (with hierarchy) ────────────────
  console.log('  Creating categories …');

  // Top-level categories
  const catMen = await prisma.category.upsert({
    where: { slug: 'mens-fashion' },
    update: { isActive: true },
    create: {
      name: "Men's Fashion",
      slug: 'mens-fashion',
      description: 'Clothing and accessories for men.',
      sortOrder: 1,
      isActive: true,
    },
  });

  const catWomen = await prisma.category.upsert({
    where: { slug: 'womens-fashion' },
    update: { isActive: true },
    create: {
      name: "Women's Fashion",
      slug: 'womens-fashion',
      description: 'Clothing and accessories for women.',
      sortOrder: 2,
      isActive: true,
    },
  });

  const catKids = await prisma.category.upsert({
    where: { slug: 'kids-fashion' },
    update: { isActive: true },
    create: {
      name: "Kids' Fashion",
      slug: 'kids-fashion',
      description: 'Clothing for boys and girls.',
      sortOrder: 3,
      isActive: true,
    },
  });

  const catJewellery = await prisma.category.upsert({
    where: { slug: 'jewellery' },
    update: { isActive: true },
    create: {
      name: 'Jewellery',
      slug: 'jewellery',
      description: 'Elegant jewellery and accessories.',
      sortOrder: 4,
      isActive: true,
    },
  });

  // Child categories — Men
  const menCategories = [
    { name: 'Kurtas', slug: 'mens-kurtas', parentId: catMen.id, brandId: brands.get('Manyavar')?.id, sortOrder: 1 },
    { name: 'Shirts', slug: 'mens-shirts', parentId: catMen.id, brandId: brands.get('Allen Solly')?.id, sortOrder: 2 },
    { name: 'Jeans', slug: 'mens-jeans', parentId: catMen.id, brandId: brands.get("Levi's")?.id, sortOrder: 3 },
    { name: 'Ethnic Wear', slug: 'mens-ethnic-wear', parentId: catMen.id, brandId: brands.get('Manyavar')?.id, sortOrder: 4 },
  ];

  // Child categories — Women
  const womenCategories = [
    { name: 'Sarees', slug: 'womens-sarees', parentId: catWomen.id, brandId: brands.get('Biba')?.id, sortOrder: 1 },
    { name: 'Kurtis', slug: 'womens-kurtis', parentId: catWomen.id, brandId: brands.get('W')?.id, sortOrder: 2 },
    { name: 'Long Kurti', slug: 'womens-long-kurti', parentId: catWomen.id, brandId: brands.get('W')?.id, sortOrder: 3 },
    { name: 'Short Kurti', slug: 'womens-short-kurti', parentId: catWomen.id, brandId: brands.get('W')?.id, sortOrder: 4 },
    { name: 'Gown', slug: 'womens-gown', parentId: catWomen.id, brandId: brands.get('Biba')?.id, sortOrder: 5 },
    { name: 'Dresses', slug: 'womens-dresses', parentId: catWomen.id, brandId: brands.get('W')?.id, sortOrder: 6 },
    { name: 'Ethnic Wear', slug: 'womens-ethnic-wear', parentId: catWomen.id, brandId: brands.get('Biba')?.id, sortOrder: 7 },
  ];

  // Child categories — Kids
  const kidsCategories = [
    { name: 'Boys', slug: 'kids-boys', parentId: catKids.id, sortOrder: 1 },
    { name: 'Girls', slug: 'kids-girls', parentId: catKids.id, sortOrder: 2 },
  ];

  const allChildCategories = [...menCategories, ...womenCategories, ...kidsCategories];
  const categoryBySlug = new Map<string, { id: string; name: string; slug: string }>();

  for (const cc of allChildCategories) {
    const cat = await prisma.category.upsert({
      where: { slug: cc.slug },
      update: { name: cc.name, sortOrder: cc.sortOrder, isActive: true },
      create: {
        name: cc.name,
        slug: cc.slug,
        parentId: cc.parentId,
        brandId: (cc as any).brandId ?? null,
        sortOrder: cc.sortOrder,
        isActive: true,
      },
    });
    categoryBySlug.set(cat.slug, { id: cat.id, name: cat.name, slug: cat.slug });
  }
  console.log(`  ✔  ${3 + allChildCategories.length} categories created (${allChildCategories.length} sub-categories)`);

  // ── 6. Super Admin User ───────────────────────────
  console.log('  Creating Super Admin user …');
  const adminPassword = await hashPassword('Admin@123');
  const superAdmin = await prisma.adminUser.upsert({
    where: { email: 'admin@rrfashion.com' },
    update: {
      name: 'Super Admin',
      passwordHash: adminPassword,
      roleId: superAdminRole.id,
      isActive: true,
    },
    create: {
      name: 'Super Admin',
      email: 'admin@rrfashion.com',
      passwordHash: adminPassword,
      roleId: superAdminRole.id,
      storeIds: [mainStore.id],
      isActive: true,
    },
  });
  console.log(`  ✔  Admin: ${superAdmin.email} (password: Admin\@123)`);

  // ── 7. Sample Customer ────────────────────────────
  console.log('  Creating sample customer …');
  const customerPassword = await hashPassword('Password123!');
  const sampleCustomer = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      firstName: 'Riya',
      lastName: 'Sharma',
      passwordHash: customerPassword,
      isActive: true,
    },
    create: {
      email: 'user@example.com',
      passwordHash: customerPassword,
      firstName: 'Riya',
      lastName: 'Sharma',
      phone: '+919876543211',
      role: 'CUSTOMER',
      isActive: true,
      addresses: [
        {
          type: 'home',
          line1: '42, Lakeview Apartments',
          city: 'Surat',
          state: 'Gujarat',
          pincode: '395001',
        },
      ],
    },
  });
  console.log(`  ✔  Customer: ${sampleCustomer.email} (password: Password123\!)`);

  // ── 8. Sample Products with Variants & Inventory ──
  console.log('  Creating sample products …');

  // Helper: create product with variants
  async function createProductWithVariants(
    productData: {
      name: string;
      slug: string;
      description: string;
      basePrice: number;
      salePrice?: number;
      isFeatured: boolean;
      isRentable: boolean;
      isSellable: boolean;
      fabric?: string;
      hsnCode?: string;
      careInstructions?: string;
      sortPriority: number;
      categorySlug: string;
      brandName: string;
      stock: number;
      images: string[];
    },
    variants: Array<{
      size: string;
      color: string;
      sku: string;
      salePrice?: number;
      rentPricePerDay?: number;
      securityDeposit?: number;
      weightGrams?: number;
      qtyToCreate?: number; // inventory units to create (for rentable items)
    }>,
  ) {
    const category = categoryBySlug.get(productData.categorySlug);
    if (!category) {
      console.warn(`  ⚠  Category not found: ${productData.categorySlug}, skipping product ${productData.name}`);
      return;
    }
    const brand = brands.get(productData.brandName);
    if (!brand) {
      console.warn(`  ⚠  Brand not found: ${productData.brandName}, skipping product ${productData.name}`);
      return;
    }

    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {
        name: productData.name,
        description: productData.description,
        basePrice: productData.basePrice,
        salePrice: productData.salePrice ?? null,
        images: productData.images,
        stock: productData.stock,
        isFeatured: productData.isFeatured,
        isActive: true,
        fabric: productData.fabric ?? null,
        hsnCode: productData.hsnCode ?? null,
        isRentable: productData.isRentable,
        isSellable: productData.isSellable,
        careInstructions: productData.careInstructions ?? null,
        sortPriority: productData.sortPriority,
        categoryId: category.id,
        brandId: brand.id,
      },
      create: {
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        basePrice: productData.basePrice,
        salePrice: productData.salePrice ?? null,
        images: productData.images,
        stock: productData.stock,
        isFeatured: productData.isFeatured,
        isActive: true,
        fabric: productData.fabric ?? null,
        hsnCode: productData.hsnCode ?? null,
        isRentable: productData.isRentable,
        isSellable: productData.isSellable,
        careInstructions: productData.careInstructions ?? null,
        sortPriority: productData.sortPriority,
        categoryId: category.id,
        brandId: brand.id,
      },
    });

    const createdVariants: Array<{ id: string; sku: string; size: string; color: string }> = [];
    for (const v of variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          size: v.size,
          color: v.color,
          salePrice: v.salePrice ?? null,
          rentPricePerDay: v.rentPricePerDay ?? null,
          securityDeposit: v.securityDeposit ?? null,
          weightGrams: v.weightGrams ?? null,
          isActive: true,
        },
        create: {
          productId: product.id,
          size: v.size,
          color: v.color,
          sku: v.sku,
          salePrice: v.salePrice ?? null,
          rentPricePerDay: v.rentPricePerDay ?? null,
          securityDeposit: v.securityDeposit ?? null,
          weightGrams: v.weightGrams ?? null,
          isActive: true,
        },
      });

      createdVariants.push({ id: variant.id, sku: variant.sku, size: variant.size, color: variant.color });

      // Create inventory summary for this variant
      const summaryQty = productData.stock / variants.length;
      await prisma.inventorySummary.upsert({
        where: { variantId_storeId: { variantId: variant.id, storeId: mainStore.id } },
        update: {
          quantityAvailable: Math.floor(summaryQty),
        },
        create: {
          variantId: variant.id,
          storeId: mainStore.id,
          quantityAvailable: Math.floor(summaryQty),
          quantityReserved: 0,
          quantitySold: 0,
        },
      });

      // Create inventory units for rentable products
      if (productData.isRentable && v.qtyToCreate) {
        const units: Array<{
          variantId: string;
          storeId: string;
          status: string;
          conditionNotes: string;
        }> = [];
        for (let i = 0; i < v.qtyToCreate; i++) {
          units.push({
            variantId: variant.id,
            storeId: mainStore.id,
            status: 'available',
            conditionNotes: 'New / Like new',
          });
        }
        await prisma.inventoryUnit.createMany({ data: units, skipDuplicates: false });
      }
    }

    console.log(`  ✔  Product: ${product.name} (${createdVariants.length} variants)`);
    return { product, variants: createdVariants };
  }

  // ── Product 1: Printed Cotton Kurta (FabIndia, Mens > Kurtas, Rentable + Sellable) ──
  await createProductWithVariants(
    {
      name: 'Printed Cotton Kurta',
      slug: 'printed-cotton-kurta',
      description: 'Comfortable hand-block printed cotton kurta. Perfect for festive occasions and casual wear.',
      basePrice: 1499.00,
      salePrice: 999.00,
      isFeatured: true,
      isRentable: true,
      isSellable: true,
      fabric: 'Cotton',
      hsnCode: '6204.42',
      careInstructions: 'Machine wash cold. Do not bleach. Iron on medium heat.',
      sortPriority: 10,
      categorySlug: 'mens-kurtas',
      brandName: 'FabIndia',
      stock: 25,
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
      ],
    },
    [
      { size: 'S', color: 'Blue', sku: 'FI-KUR-BL-S', salePrice: 999.00, rentPricePerDay: 150.00, securityDeposit: 1500.00, weightGrams: 300, qtyToCreate: 3 },
      { size: 'M', color: 'Blue', sku: 'FI-KUR-BL-M', salePrice: 999.00, rentPricePerDay: 150.00, securityDeposit: 1500.00, weightGrams: 320, qtyToCreate: 3 },
      { size: 'L', color: 'Blue', sku: 'FI-KUR-BL-L', salePrice: 999.00, rentPricePerDay: 150.00, securityDeposit: 1500.00, weightGrams: 340, qtyToCreate: 3 },
      { size: 'S', color: 'Green', sku: 'FI-KUR-GN-S', salePrice: 999.00, rentPricePerDay: 150.00, securityDeposit: 1500.00, weightGrams: 300, qtyToCreate: 2 },
      { size: 'M', color: 'Green', sku: 'FI-KUR-GN-M', salePrice: 999.00, rentPricePerDay: 150.00, securityDeposit: 1500.00, weightGrams: 320, qtyToCreate: 2 },
    ],
  );

  // ── Product 2: Silk Embroidered Saree (Biba, Womens > Sarees, Rentable + Sellable) ──
  await createProductWithVariants(
    {
      name: 'Silk Embroidered Saree',
      slug: 'silk-embroidered-saree',
      description: 'Elegant silk saree with intricate thread embroidery. Ideal for weddings and celebrations.',
      basePrice: 4999.00,
      salePrice: 3499.00,
      isFeatured: true,
      isRentable: true,
      isSellable: true,
      fabric: 'Silk',
      hsnCode: '5007.20',
      careInstructions: 'Dry clean only. Store in a cool, dry place.',
      sortPriority: 8,
      categorySlug: 'womens-sarees',
      brandName: 'Biba',
      stock: 10,
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
      ],
    },
    [
      { size: 'Free', color: 'Red', sku: 'BIBA-SAR-RD-F', salePrice: 3499.00, rentPricePerDay: 350.00, securityDeposit: 3500.00, weightGrams: 500, qtyToCreate: 2 },
      { size: 'Free', color: 'Blue', sku: 'BIBA-SAR-BL-F', salePrice: 3499.00, rentPricePerDay: 350.00, securityDeposit: 3500.00, weightGrams: 500, qtyToCreate: 2 },
      { size: 'Free', color: 'Green', sku: 'BIBA-SAR-GN-F', salePrice: 3499.00, rentPricePerDay: 350.00, securityDeposit: 3500.00, weightGrams: 500, qtyToCreate: 2 },
    ],
  );

  // ── Product 3: Casual Shirt (Allen Solly, Mens > Shirts, Sell-only) ──
  await createProductWithVariants(
    {
      name: "Men's Casual Shirt",
      slug: 'mens-casual-shirt-allen-solly',
      description: 'Smart casual shirt in soft cotton blend. Features a modern slim fit with button-down collar.',
      basePrice: 1999.00,
      salePrice: 1299.00,
      isFeatured: true,
      isRentable: false,
      isSellable: true,
      fabric: 'Cotton Blend',
      hsnCode: '6205.20',
      careInstructions: 'Machine wash gentle. Tumble dry low.',
      sortPriority: 7,
      categorySlug: 'mens-shirts',
      brandName: 'Allen Solly',
      stock: 40,
      images: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
      ],
    },
    [
      { size: 'S', color: 'White', sku: 'AS-SHR-WH-S', salePrice: 1299.00, weightGrams: 250 },
      { size: 'M', color: 'White', sku: 'AS-SHR-WH-M', salePrice: 1299.00, weightGrams: 270 },
      { size: 'L', color: 'White', sku: 'AS-SHR-WH-L', salePrice: 1299.00, weightGrams: 290 },
      { size: 'M', color: 'Blue', sku: 'AS-SHR-BL-M', salePrice: 1299.00, weightGrams: 270 },
      { size: 'L', color: 'Blue', sku: 'AS-SHR-BL-L', salePrice: 1299.00, weightGrams: 290 },
    ],
  );

  // ── Product 4: Cotton Kurti (W, Womens > Kurtis, Sell-only) ──
  await createProductWithVariants(
    {
      name: 'Printed Cotton Kurti',
      slug: 'printed-cotton-kurti',
      description: 'Trendy printed cotton kurti with three-quarter sleeves. Pair with leggings or palazzos.',
      basePrice: 999.00,
      salePrice: 699.00,
      isFeatured: false,
      isRentable: false,
      isSellable: true,
      fabric: 'Cotton',
      hsnCode: '6204.42',
      careInstructions: 'Machine wash cold. Do not bleach.',
      sortPriority: 6,
      categorySlug: 'womens-kurtis',
      brandName: 'W',
      stock: 35,
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
      ],
    },
    [
      { size: 'S', color: 'Pink', sku: 'W-KUR-PK-S', salePrice: 699.00, weightGrams: 200 },
      { size: 'M', color: 'Pink', sku: 'W-KUR-PK-M', salePrice: 699.00, weightGrams: 220 },
      { size: 'L', color: 'Pink', sku: 'W-KUR-PK-L', salePrice: 699.00, weightGrams: 240 },
      { size: 'S', color: 'Yellow', sku: 'W-KUR-YL-S', salePrice: 699.00, weightGrams: 200 },
      { size: 'M', color: 'Yellow', sku: 'W-KUR-YL-M', salePrice: 699.00, weightGrams: 220 },
    ],
  );

  // ── Product 5: Denim Jeans (Levi's, Mens > Jeans, Sell-only) ──
  await createProductWithVariants(
    {
      name: "Levi's 512 Slim Fit Jeans",
      slug: 'levis-512-slim-fit-jeans',
      description: 'Iconic slim fit jeans in stretch denim. Features the classic Levi\'s branding and five-pocket design.',
      basePrice: 3999.00,
      salePrice: 2999.00,
      isFeatured: true,
      isRentable: false,
      isSellable: true,
      fabric: 'Denim',
      hsnCode: '6203.42',
      careInstructions: 'Machine wash inside out with like colors. Tumble dry medium.',
      sortPriority: 9,
      categorySlug: 'mens-jeans',
      brandName: "Levi's",
      stock: 30,
      images: [
        'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
      ],
    },
    [
      { size: '28', color: 'Blue', sku: 'LEV-JE-BL-28', salePrice: 2999.00, weightGrams: 450 },
      { size: '30', color: 'Blue', sku: 'LEV-JE-BL-30', salePrice: 2999.00, weightGrams: 480 },
      { size: '32', color: 'Blue', sku: 'LEV-JE-BL-32', salePrice: 2999.00, weightGrams: 510 },
      { size: '34', color: 'Blue', sku: 'LEV-JE-BL-34', salePrice: 2999.00, weightGrams: 540 },
    ],
  );

  // ── 9. Sample Orders ───────────────────────────────────
  console.log('  Creating sample orders …');

  // Get a variant for the order
  const kurtaVariant = await prisma.productVariant.findFirst({
    where: { sku: 'FI-KUR-BL-M' },
    include: { product: true },
  });

  const sareeVariant = await prisma.productVariant.findFirst({
    where: { sku: 'BIBA-SAR-RD-F' },
    include: { product: true },
  });

  const shirtVariant = await prisma.productVariant.findFirst({
    where: { sku: 'AS-SHR-WH-L' },
    include: { product: true },
  });

  if (kurtaVariant && sareeVariant && shirtVariant) {
    // Order 1: Delivered order
    const order1 = await prisma.order.create({
      data: {
        userId: sampleCustomer.id,
        storeId: mainStore.id,
        status: 'DELIVERED',
        channel: 'ONLINE',
        orderNumber: `ORD-${Date.now()}-001`,
        subtotal: 3297,
        totalAmount: 3297,
        discountAmount: 0,
        shippingCharge: 0,
        taxAmount: 0,
        paymentStatus: 'PAID',
        paymentMethod: 'razorpay',
        deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        items: {
          create: [
            {
              productId: kurtaVariant.productId,
              variantId: kurtaVariant.id,
              quantity: 2,
              unitPrice: 999,
              totalPrice: 1998,
              subtotal: 1998,
              type: 'sale',
            },
            {
              productId: shirtVariant.productId,
              variantId: shirtVariant.id,
              quantity: 1,
              unitPrice: 1299,
              totalPrice: 1299,
              subtotal: 1299,
              type: 'sale',
            },
          ],
        },
      },
    });

    // Create shipping address for order 1
    await prisma.shippingAddress.create({
      data: {
        orderId: order1.id,
        name: 'Riya Sharma',
        phone: '+919876543211',
        line1: '42, Lakeview Apartments',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395001',
      },
    });

    // Order 2: Shipped order
    const order2 = await prisma.order.create({
      data: {
        userId: sampleCustomer.id,
        storeId: mainStore.id,
        status: 'SHIPPED',
        channel: 'ONLINE',
        orderNumber: `ORD-${Date.now()}-002`,
        subtotal: 3499,
        totalAmount: 3499,
        discountAmount: 0,
        shippingCharge: 0,
        taxAmount: 0,
        paymentStatus: 'PAID',
        paymentMethod: 'razorpay',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        items: {
          create: [
            {
              productId: sareeVariant.productId,
              variantId: sareeVariant.id,
              quantity: 1,
              unitPrice: 3499,
              totalPrice: 3499,
              subtotal: 3499,
              type: 'sale',
            },
          ],
        },
      },
    });

    // Create shipping address for order 2
    await prisma.shippingAddress.create({
      data: {
        orderId: order2.id,
        name: 'Riya Sharma',
        phone: '+919876543211',
        line1: '42, Lakeview Apartments',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395001',
      },
    });

    console.log(`  ✔  2 sample orders created for ${sampleCustomer.email}`);
  }

  // ── 10. Summary ────────────────────────────────────
  console.log('\n  ── Seed Summary ──────────────────────');
  console.log(`  🏪  Store:             ${mainStore.name}`);
  console.log(`  👤  Admin:             ${superAdmin.email}`);
  console.log(`  👤  Customer:          ${sampleCustomer.email}`);
  console.log(`  🏷️   Brands:            ${brands.size}`);
  console.log(`  📂  Categories:        ${2 + allChildCategories.length}`);
  console.log(`  👑  Roles:             3 (Super Admin, Store Manager, Inventory Staff)`);
  console.log(`  🔐  Permissions:       ${createdPermissions.length}`);
  console.log(`  📦  Products:          5`);
  console.log(`  🔄  Product Variants:  varies per product`);

  console.log('\n✅  Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
