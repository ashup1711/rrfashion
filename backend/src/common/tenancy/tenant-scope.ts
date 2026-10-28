import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TENANT_SCOPED_MODELS } from './tenant.constants';

type Data = Record<string, unknown>;

const WHERE_ACTIONS = new Set<string>([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

/** model name -> relation field name -> related model name */
const relationMap: Map<string, Map<string, string>> = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [
    model.name,
    new Map(
      model.fields
        .filter((field) => field.kind === 'object')
        .map((field) => [field.name, field.type as string]),
    ),
  ]),
);

const logger = new Logger('TenantScope');
const warnedModels = new Set<string>();

const isObject = (value: unknown): value is Data =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);

const each = (value: unknown, fn: (item: Data) => Data): unknown =>
  Array.isArray(value)
    ? value.map((v) => (isObject(v) ? fn(v) : v))
    : isObject(value)
      ? fn(value)
      : value;

function scopeCreate(model: string, data: Data, tenantId: string): Data {
  const scoped = scopeNestedWrites(model, data, tenantId);
  return TENANT_SCOPED_MODELS.has(model) ? { ...scoped, tenantId } : scoped;
}

/** Injects tenantId into nested create/createMany/connectOrCreate/upsert payloads. */
function scopeNestedWrites(model: string, data: Data, tenantId: string): Data {
  const relations = relationMap.get(model);
  if (!relations) return data;
  let result: Data | undefined;
  for (const [field, value] of Object.entries(data)) {
    const related = relations.get(field);
    if (!related || !isObject(value)) continue;
    const ops: Data = { ...value };
    if (ops.create !== undefined) {
      ops.create = each(ops.create, (d) => scopeCreate(related, d, tenantId));
    }
    if (isObject(ops.createMany) && Array.isArray(ops.createMany.data)) {
      ops.createMany = {
        ...ops.createMany,
        data: each(ops.createMany.data, (d) => scopeCreate(related, d, tenantId)),
      };
    }
    if (ops.connectOrCreate !== undefined) {
      ops.connectOrCreate = each(ops.connectOrCreate, (c) => ({
        ...c,
        create: isObject(c.create) ? scopeCreate(related, c.create, tenantId) : c.create,
      }));
    }
    if (ops.upsert !== undefined) {
      ops.upsert = each(ops.upsert, (u) => ({
        ...u,
        create: isObject(u.create) ? scopeCreate(related, u.create, tenantId) : u.create,
        update: isObject(u.update) ? scopeNestedWrites(related, u.update, tenantId) : u.update,
      }));
    }
    if (ops.update !== undefined) {
      ops.update = each(ops.update, (u) =>
        isObject(u.data)
          ? { ...u, data: scopeNestedWrites(related, u.data, tenantId) }
          : scopeNestedWrites(related, u, tenantId),
      );
    }
    result = { ...(result ?? data), [field]: ops };
  }
  return result ?? data;
}

/**
 * Rewrites Prisma operation params so tenant-scoped models only read and write rows
 * belonging to `tenantId`. Returns params unchanged when there is no tenant context.
 */
export function applyTenantScope(
  params: Prisma.MiddlewareParams,
  tenantId: string | undefined,
): Prisma.MiddlewareParams {
  const { model, action } = params;
  if (!model) return params;

  if (!tenantId) {
    if (TENANT_SCOPED_MODELS.has(model) && !warnedModels.has(model)) {
      warnedModels.add(model);
      logger.debug(`Query on tenant-scoped model ${model} without tenant context`);
    }
    return params;
  }

  const args: Data = { ...((params.args as Data | undefined) ?? {}) };
  const scoped = TENANT_SCOPED_MODELS.has(model);

  if (scoped && WHERE_ACTIONS.has(action)) {
    args.where = { ...((args.where as Data | undefined) ?? {}), tenantId };
  }

  switch (action) {
    case 'create':
      if (isObject(args.data)) args.data = scopeCreate(model, args.data, tenantId);
      break;
    case 'createMany':
      args.data = each(args.data, (d) => scopeCreate(model, d, tenantId));
      break;
    case 'upsert':
      if (isObject(args.create)) args.create = scopeCreate(model, args.create, tenantId);
      if (isObject(args.update)) args.update = scopeNestedWrites(model, args.update, tenantId);
      break;
    case 'update':
    case 'updateMany':
      if (isObject(args.data)) {
        const { tenantId: _ignored, ...rest } = args.data;
        void _ignored;
        args.data = scopeNestedWrites(model, rest, tenantId);
      }
      break;
    default:
      break;
  }

  return { ...params, args };
}
