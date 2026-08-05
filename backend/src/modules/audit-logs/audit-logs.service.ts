import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogInput {
  adminId: string;
  action: string;
  entity: string;
  entityId?: string;
  beforeJson?: Record<string, unknown>;
  afterJson?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQueryFilters {
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  from?: string;
  to?: string;
}

export interface AuditLogQueryResult {
  items: Array<{
    id: string;
    adminId: string | null;
    adminName: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        beforeJson: (input.beforeJson ?? {}) as Prisma.InputJsonValue,
        afterJson: (input.afterJson ?? {}) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  /**
   * REQ-BE-026 — paginated + filtered read of the audit log for the admin UI.
   * All filters are optional; `actorId` maps to the `adminId` column.
   * Scoped entirely from server-side filter values — never trusts a client
   * id for ownership (SEC-06). Returns 1-based pagination metadata.
   */
  async query(filters: AuditLogQueryFilters, page = 1, limit = 20): Promise<AuditLogQueryResult> {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.actorId) where.adminId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { admin: { select: { id: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        adminId: row.adminId,
        adminName: row.admin?.name ?? null,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
