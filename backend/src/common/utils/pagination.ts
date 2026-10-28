import type { PaginatedResponse } from '../types/pagination';

interface PaginateModel {
  findMany(args: unknown): Promise<unknown[]>;
  count(args: unknown): Promise<number>;
}

export interface PaginateArgs {
  where?: unknown;
  orderBy?: unknown;
  page?: number;
  limit?: number;
  include?: unknown;
  select?: unknown;
}

export async function paginate<T>(
  model: PaginateModel,
  args: PaginateArgs,
): Promise<PaginatedResponse<T>> {
  const page = Math.max(1, args.page ?? 1);
  const limit = Math.min(Math.max(1, args.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({ ...args, skip, take: limit }),
    model.count({ where: args.where }),
  ]);

  return {
    data: data as T[],
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
