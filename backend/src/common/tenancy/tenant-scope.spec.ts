import { Prisma } from '@prisma/client';
import { applyTenantScope } from './tenant-scope';

const T = 'tenant-1';
const params = (model: string, action: string, args: unknown): Prisma.MiddlewareParams =>
  ({ model, action, args, dataPath: [], runInTransaction: false }) as Prisma.MiddlewareParams;

describe('applyTenantScope', () => {
  it('leaves params untouched without a tenant context', () => {
    const p = params('Product', 'findMany', { where: { id: '1' } });
    expect(applyTenantScope(p, undefined)).toBe(p);
  });

  it('does not scope global models', () => {
    const p = params('Permission', 'findMany', { where: { module: 'x' } });
    expect(applyTenantScope(p, T).args).toEqual({ where: { module: 'x' } });
  });

  it.each(['findUnique', 'findFirst', 'findMany', 'count', 'update', 'delete', 'deleteMany'])(
    'adds tenantId to where for %s',
    (action) => {
      const result = applyTenantScope(params('Order', action, { where: { id: 'o1' } }), T);
      expect(result.args.where).toEqual({ id: 'o1', tenantId: T });
    },
  );

  it('overrides a caller-supplied tenantId in where', () => {
    const result = applyTenantScope(params('Order', 'findMany', { where: { tenantId: 'x' } }), T);
    expect(result.args.where.tenantId).toBe(T);
  });

  it('injects tenantId into create, createMany and upsert', () => {
    expect(applyTenantScope(params('Order', 'create', { data: { a: 1 } }), T).args.data).toEqual({
      a: 1,
      tenantId: T,
    });
    expect(
      applyTenantScope(params('Order', 'createMany', { data: [{ a: 1 }, { a: 2 }] }), T).args.data,
    ).toEqual([
      { a: 1, tenantId: T },
      { a: 2, tenantId: T },
    ]);
    const upsert = applyTenantScope(
      params('Order', 'upsert', { where: { id: 'o' }, create: { a: 1 }, update: { a: 2 } }),
      T,
    ).args;
    expect(upsert.create).toEqual({ a: 1, tenantId: T });
    expect(upsert.where).toEqual({ id: 'o', tenantId: T });
  });

  it('injects tenantId into nested relation writes', () => {
    const result = applyTenantScope(
      params('Order', 'create', {
        data: {
          orderNumber: 'X',
          items: { create: [{ quantity: 1 }, { quantity: 2 }] },
          statusLogs: { createMany: { data: [{ status: 'PENDING' }] } },
        },
      }),
      T,
    );
    expect(result.args.data.items.create).toEqual([
      { quantity: 1, tenantId: T },
      { quantity: 2, tenantId: T },
    ]);
    expect(result.args.data.tenantId).toBe(T);
  });

  it('strips tenantId from update data so rows cannot change tenant', () => {
    const result = applyTenantScope(
      params('Order', 'update', { where: { id: 'o' }, data: { tenantId: 'other', notes: 'n' } }),
      T,
    );
    expect(result.args.data).toEqual({ notes: 'n' });
  });
});
