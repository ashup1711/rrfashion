/**
 * Tenant isolation tests (BusinessOS Phase 1 exit criteria). Runs against the real
 * database configured by DATABASE_URL (CI provides Postgres with migrations applied).
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { TenantContextMiddleware } from '../../common/tenancy/tenant-context.middleware';
import { TenantsService } from './tenants.service';

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb('Tenant isolation (database)', () => {
  const prisma = new PrismaService();
  const config = new ConfigService({ PLATFORM_ADMIN_EMAILS: '' });
  const tenants = new TenantsService(prisma, config);
  const run = Date.now().toString(36);
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const roleId = randomUUID();
  const adminId = randomUUID();
  const catA = randomUUID();
  const catB = randomUUID();

  // PrismaPromises are lazy: they must be awaited inside the tenant context.
  const inA = <T>(fn: () => PromiseLike<T>) =>
    TenantContext.runWithTenant(tenantA, async () => await fn());
  const inB = <T>(fn: () => PromiseLike<T>) =>
    TenantContext.runWithTenant(tenantB, async () => await fn());

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.tenant.createMany({
      data: [
        { id: tenantA, name: 'Tenant A', slug: `iso-a-${run}`, businessType: 'RETAIL' },
        { id: tenantB, name: 'Tenant B', slug: `iso-b-${run}`, businessType: 'SERVICES' },
      ],
    });
    await prisma.roleModel.create({ data: { id: roleId, name: `iso-role-${run}` } });
    await prisma.adminUser.create({
      data: {
        id: adminId,
        name: 'Iso Admin',
        email: `iso-${run}@example.com`,
        passwordHash: 'x',
        roleId,
      },
    });
    await prisma.tenantMembership.create({
      data: { tenantId: tenantA, adminUserId: adminId, role: 'OWNER' },
    });
    // Overlapping data: same category name in both tenants.
    await inA(() =>
      prisma.category.create({ data: { id: catA, name: 'Shared Name', slug: `iso-a-${run}` } }),
    );
    await inB(() =>
      prisma.category.create({ data: { id: catB, name: 'Shared Name', slug: `iso-b-${run}` } }),
    );
  });

  afterAll(async () => {
    await prisma.category.deleteMany({ where: { id: { in: [catA, catB] } } });
    await prisma.tenantMembership.deleteMany({ where: { adminUserId: adminId } });
    await prisma.adminUser.deleteMany({ where: { id: adminId } });
    await prisma.roleModel.deleteMany({ where: { id: roleId } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma.$disconnect();
  });

  it('assigns the context tenant on create, ignoring a spoofed tenantId', async () => {
    const id = randomUUID();
    await inA(() =>
      prisma.category.create({
        data: { id, name: 'Spoof', slug: `iso-spoof-${run}`, tenantId: tenantB },
      }),
    );
    const row = await prisma.category.findUnique({ where: { id } });
    expect(row?.tenantId).toBe(tenantA);
    await prisma.category.delete({ where: { id } });
  });

  it('only returns the active tenant rows for overlapping data', async () => {
    const a = await inA(() => prisma.category.findMany({ where: { name: 'Shared Name' } }));
    const b = await inB(() => prisma.category.findMany({ where: { name: 'Shared Name' } }));
    expect(a.map((c) => c.id)).toEqual([catA]);
    expect(b.map((c) => c.id)).toEqual([catB]);
    expect(await inA(() => prisma.category.count({ where: { name: 'Shared Name' } }))).toBe(1);
  });

  it('blocks cross-tenant reads, updates and deletes by id', async () => {
    expect(await inB(() => prisma.category.findUnique({ where: { id: catA } }))).toBeNull();
    expect(await inB(() => prisma.category.findFirst({ where: { id: catA } }))).toBeNull();
    await expect(
      inB(() => prisma.category.update({ where: { id: catA }, data: { name: 'Hacked' } })),
    ).rejects.toThrow();
    await expect(inB(() => prisma.category.delete({ where: { id: catA } }))).rejects.toThrow();
    const many = await inB(() =>
      prisma.category.updateMany({ where: { id: catA }, data: { name: 'Hacked' } }),
    );
    expect(many.count).toBe(0);
    const intact = await prisma.category.findUnique({ where: { id: catA } });
    expect(intact?.name).toBe('Shared Name');
  });

  it('cannot move a row to another tenant via update', async () => {
    await inA(() =>
      prisma.category.update({
        where: { id: catA },
        data: { tenantId: tenantB } as never,
      }),
    );
    const row = await prisma.category.findUnique({ where: { id: catA } });
    expect(row?.tenantId).toBe(tenantA);
  });

  it('applies the tenant to raw SQL and transactions (app_tenant_visible / RLS setting)', async () => {
    const rows = await inB(
      () =>
        prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM categories WHERE id IN (${catA}, ${catB}) AND app_tenant_visible("tenantId")`,
    );
    expect(rows.map((r) => r.id)).toEqual([catB]);
    const setting = await inA(() =>
      prisma.$transaction(
        async (tx) =>
          tx.$queryRaw<
            Array<{ t: string }>
          >`SELECT current_setting('app.current_tenant_id', true) AS t`,
      ),
    );
    expect(setting[0].t).toBe(tenantA);
  });

  it('enforces RLS policies for non-superuser roles', async () => {
    const role = `rls_probe_${run}`;
    await prisma.$executeRawUnsafe(`CREATE ROLE ${role} NOLOGIN`);
    try {
      await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${role}`);
      await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT ON categories TO ${role}`);
      const visible = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantB}, true)`;
        return tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM categories WHERE id IN (${catA}, ${catB})`;
      });
      expect(visible.map((r) => r.id)).toEqual([catB]);

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
          await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantB}, true)`;
          await tx.$executeRaw`
            INSERT INTO categories (id, name, slug, "tenantId", "updatedAt")
            VALUES (${randomUUID()}, 'x', ${`iso-rls-${run}`}, ${tenantA}, now())`;
        }),
      ).rejects.toThrow(/row-level security/);
    } finally {
      await prisma.$executeRawUnsafe(`REVOKE ALL ON categories FROM ${role}`);
      await prisma.$executeRawUnsafe(`REVOKE USAGE ON SCHEMA public FROM ${role}`);
      await prisma.$executeRawUnsafe(`DROP ROLE ${role}`);
    }
  });

  describe('membership and tenant lifecycle', () => {
    const setStatus = (id: string, status: TenantStatus) =>
      prisma.tenant.update({ where: { id }, data: { status } });

    afterEach(async () => {
      await setStatus(tenantA, 'ACTIVE');
      await prisma.tenantMembership.updateMany({
        where: { adminUserId: adminId },
        data: { revokedAt: null },
      });
    });

    it('allows members and rejects non-members', async () => {
      await expect(tenants.resolveMembership(adminId, tenantA)).resolves.toMatchObject({
        tenantId: tenantA,
        role: 'OWNER',
      });
      await expect(tenants.resolveMembership(adminId, tenantB)).rejects.toThrow(ForbiddenException);
    });

    it('rejects a revoked membership immediately', async () => {
      await prisma.tenantMembership.updateMany({
        where: { adminUserId: adminId, tenantId: tenantA },
        data: { revokedAt: new Date() },
      });
      await expect(tenants.resolveMembership(adminId, tenantA)).rejects.toThrow(
        'Not a member of this tenant',
      );
      expect(await tenants.listMemberships(adminId)).toHaveLength(0);
    });

    it('blocks suspended tenants', async () => {
      await setStatus(tenantA, 'SUSPENDED');
      await expect(tenants.resolveMembership(adminId, tenantA)).rejects.toThrow(
        'Tenant is suspended',
      );
    });

    it('hides deleted tenants', async () => {
      await setStatus(tenantA, 'DELETED');
      await expect(tenants.resolveMembership(adminId, tenantA)).rejects.toThrow(NotFoundException);
    });

    it('makes past-due tenants read-only', async () => {
      await setStatus(tenantA, 'PAST_DUE');
      await expect(tenants.resolveMembership(adminId, tenantA, 'GET')).resolves.toBeDefined();
      await expect(tenants.resolveMembership(adminId, tenantA, 'POST')).rejects.toThrow(
        'read-only',
      );
    });

    it('rejects X-Tenant-Id headers for suspended or unknown tenants in the middleware', async () => {
      const middleware = new TenantContextMiddleware(tenants, config);
      const call = (tenantId: string) =>
        middleware.use(
          { headers: { 'x-tenant-id': tenantId }, method: 'GET' } as never,
          {} as never,
          jest.fn(),
        );
      await setStatus(tenantA, 'SUSPENDED');
      await expect(call(tenantA)).rejects.toThrow(ForbiddenException);
      await expect(call(randomUUID())).rejects.toThrow(NotFoundException);
      await expect(call('not-a-uuid')).rejects.toThrow('Invalid X-Tenant-Id header');

      const next = jest.fn(() => expect(TenantContext.tenantId()).toBe(tenantB));
      await middleware.use(
        { headers: { 'x-tenant-id': tenantB }, method: 'GET' } as never,
        {} as never,
        next,
      );
      expect(next).toHaveBeenCalled();
    });
  });
});
