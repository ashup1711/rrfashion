import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantContext } from '../common/tenancy/tenant-context';
import { applyTenantScope } from '../common/tenancy/tenant-scope';

type RawFn = (query: unknown, ...values: unknown[]) => Prisma.PrismaPromise<unknown>;

type TransactionFn = (
  arg: Prisma.PrismaPromise<unknown>[] | ((tx: Prisma.TransactionClient) => Promise<unknown>),
  options?: Record<string, unknown>,
) => Promise<unknown>;

const RAW_METHODS = ['$queryRaw', '$queryRawUnsafe', '$executeRaw', '$executeRawUnsafe'] as const;
const SET_TENANT_SQL = "SELECT set_config('app.current_tenant_id', $1, true)";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();

    // Application-layer tenant isolation: inject tenantId into every scoped query.
    this.$use((params, next) => next(applyTenantScope(params, TenantContext.tenantId())));

    const client = this as unknown as Record<string, unknown>;
    const prototype = PrismaClient.prototype as unknown as Record<string, RawFn>;
    const queryRawUnsafe = prototype.$queryRawUnsafe;
    const originalTransaction = (client.$transaction as TransactionFn).bind(this);

    // Database-layer isolation: transactions run inside a tenant context set the
    // transaction-local app.current_tenant_id so Postgres RLS applies to every statement.
    client.$transaction = ((arg, options) => {
      const tenantId = TenantContext.tenantId();
      if (!tenantId) return originalTransaction(arg, options);
      if (typeof arg === 'function') {
        return originalTransaction(async (tx) => {
          await queryRawUnsafe.call(tx, SET_TENANT_SQL, tenantId);
          return arg(tx);
        }, options);
      }
      return originalTransaction(
        [queryRawUnsafe.call(this, SET_TENANT_SQL, tenantId), ...arg],
        options,
      ).then((results) => (results as unknown[]).slice(1));
    }) as TransactionFn;

    // Top-level raw SQL in a tenant context runs in a short transaction with the tenant
    // setting applied. Interactive-transaction clients proxy this instance, so `this`
    // distinguishes calls on a tx (already scoped) from top-level calls.
    for (const method of RAW_METHODS) {
      const original = prototype[method];
      client[method] = function (this: unknown, query: unknown, ...values: unknown[]) {
        const tenantId = TenantContext.tenantId();
        if (this !== client || !tenantId) return original.call(this, query, ...values);
        return originalTransaction(async (tx) => {
          await queryRawUnsafe.call(tx, SET_TENANT_SQL, tenantId);
          return original.call(tx, query, ...values);
        });
      };
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
