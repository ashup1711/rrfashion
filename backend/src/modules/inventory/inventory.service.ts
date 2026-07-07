import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLockDto } from './dto/create-lock.dto';

const INVENTORY_LOCK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(params: {
    storeId?: string;
    variantId?: string;
    variantIds?: string[];
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.storeId) where.storeId = params.storeId;
    if (params.variantId) where.variantId = params.variantId;
    if (params.variantIds && params.variantIds.length > 0) {
      where.variantId = { in: params.variantIds };
    }

    const [items, total] = await Promise.all([
      this.prisma.inventorySummary.findMany({
        where,
        skip,
        take: limit,
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              size: true,
              color: true,
              salePrice: true,
              product: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          store: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.inventorySummary.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVariantDetail(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        sku: true,
        size: true,
        color: true,
        salePrice: true,
        rentPricePerDay: true,
        isActive: true,
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const summary = await this.prisma.inventorySummary.findMany({
      where: { variantId },
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
    });

    const units = await this.prisma.inventoryUnit.findMany({
      where: { variantId },
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeLocks = await this.prisma.inventoryLock.findMany({
      where: {
        variantId,
        status: 'active',
      },
      include: {
        variant: {
          select: { id: true, size: true, color: true, sku: true },
        },
        lockedBy: {
          select: { id: true, name: true, email: true },
        },
        store: {
          select: { id: true, name: true },
        },
      },
      orderBy: { lockedAt: 'desc' },
    });

    return {
      variant,
      summary,
      units,
      activeLocks,
    };
  }

  async createLock(dto: CreateLockDto, adminId: string, clientUuid: string) {
    // Check variant exists
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    // Resolve store — fallback to first active store if none provided
    let storeId = dto.storeId;
    if (!storeId) {
      const defaultStore = await this.prisma.storeLocation.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!defaultStore) {
        throw new NotFoundException('No active store found. Please contact support.');
      }
      storeId = defaultStore.id;
    }

    const store = await this.prisma.storeLocation.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const quantity = dto.quantity ?? 1;

    // Check stock availability before creating lock
    const summary = await this.prisma.inventorySummary.findUnique({
      where: {
        variantId_storeId: {
          variantId: dto.variantId,
          storeId,
        },
      },
    });

    if (summary && summary.quantityAvailable < quantity) {
      throw new ConflictException(
        `Insufficient stock: only ${summary.quantityAvailable} available, ${quantity} requested`,
      );
    }

    const expiresAt = new Date(Date.now() + INVENTORY_LOCK_TTL_MS);

    const lock = await this.prisma.$transaction(async (tx) => {
      const created = await tx.inventoryLock.create({
        data: {
          variantId: dto.variantId,
          storeId,
          lockedByAdminId: adminId,
          deviceId: dto.deviceId ?? null,
          clientUuid,
          reason: dto.reason ?? null,
          quantity,
          orderId: dto.orderId ?? null,
          status: 'active',
          expiresAt,
        },
        include: {
          variant: {
            select: { id: true, sku: true, size: true, color: true },
          },
          store: {
            select: { id: true, name: true },
          },
          lockedBy: {
            select: { id: true, name: true },
          },
        },
      });

      // Record stock movement for the lock
      await this.recordStockMovement(
        {
          variantId: dto.variantId,
          storeId,
          quantityChange: -quantity,
          type: 'LOCK',
          reference: `lock:${created.id}`,
          notes: `Locked by admin ${adminId} — ${dto.reason ?? 'no reason'}`,
          createdByAdminId: adminId,
        },
        tx,
      );

      // Decrement available, increment locked — with row-level lock
      const lockedRow = await tx.$queryRaw<Array<{ quantityAvailable: number }>>`
        SELECT * FROM inventory_summary
        WHERE "variantId" = ${dto.variantId} AND "storeId" = ${storeId}
        FOR UPDATE;
      `;
      if (!lockedRow[0] || lockedRow[0].quantityAvailable < quantity) {
        throw new ConflictException(
          `Insufficient stock: only ${lockedRow[0]?.quantityAvailable ?? 0} available, ${quantity} requested`,
        );
      }
      await tx.inventorySummary.update({
        where: { variantId_storeId: { variantId: dto.variantId, storeId } },
        data: {
          quantityAvailable: { decrement: quantity },
          quantityLocked: { increment: quantity },
        },
      });

      return created;
    });

    this.logger.log({
      adminId,
      variantId: dto.variantId,
      lockId: lock.id,
      quantity,
      action: 'inventory.lock.created',
    });

    return lock;
  }

  async releaseLock(id: string): Promise<void> {
    const lock = await this.prisma.inventoryLock.findUnique({
      where: { id },
    });

    if (!lock) {
      throw new NotFoundException('Lock not found');
    }

    if (lock.status !== 'active') {
      throw new BadRequestException('Lock is not active');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryLock.update({
        where: { id },
        data: {
          status: 'released',
          releasedAt: new Date(),
        },
      });

      // Record stock movement for the release
      await this.recordStockMovement(
        {
          variantId: lock.variantId,
          storeId: lock.storeId,
          quantityChange: lock.quantity,
          type: 'UNLOCK',
          reference: `lock-release:${id}`,
          notes: `Released lock on ${lock.quantity} item(s)`,
          createdByAdminId: lock.lockedByAdminId ?? undefined,
        },
        tx,
      );

      // Restore inventory — increment available, decrement locked — with row-level lock
      await tx.$queryRaw`
        SELECT * FROM inventory_summary
        WHERE "variantId" = ${lock.variantId} AND "storeId" = ${lock.storeId}
        FOR UPDATE;
      `;
      await tx.inventorySummary.update({
        where: { variantId_storeId: { variantId: lock.variantId, storeId: lock.storeId } },
        data: {
          quantityAvailable: { increment: lock.quantity },
          quantityLocked: { decrement: lock.quantity },
        },
      });
    });

    this.logger.log({
      lockId: id,
      action: 'inventory.lock.released',
    });
  }

  /**
   * Creates a lock linked to an order during checkout.
   */
  async createOrderLock(
    variantId: string,
    storeId: string,
    orderId: string,
    quantity: number,
  ): Promise<void> {
    const summary = await this.prisma.inventorySummary.findUnique({
      where: {
        variantId_storeId: {
          variantId,
          storeId,
        },
      },
    });

    if (!summary || summary.quantityAvailable < quantity) {
      throw new ConflictException(
        `Insufficient stock: only ${summary?.quantityAvailable ?? 0} available, ${quantity} requested`,
      );
    }

    const expiresAt = new Date(Date.now() + INVENTORY_LOCK_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryLock.create({
        data: {
          variantId,
          storeId,
          orderId,
          clientUuid: `order:${orderId}`,
          quantity,
          status: 'active',
          expiresAt,
        },
      });

      await this.recordStockMovement(
        {
          variantId,
          storeId,
          quantityChange: -quantity,
          type: 'SALE',
          reference: `order:${orderId}`,
          notes: `Reserved ${quantity} item(s) for order ${orderId}`,
        },
        tx,
      );
    });

    this.logger.log({
      variantId,
      orderId,
      quantity,
      action: 'inventory.order-lock.created',
    });
  }

  /**
   * Cron job that runs every 10 minutes to release expired locks.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async releaseExpiredLocks(): Promise<void> {
    const now = new Date();
    const expiredLocks = await this.prisma.inventoryLock.findMany({
      where: {
        status: 'active',
        expiresAt: { lte: now },
      },
    });

    if (expiredLocks.length === 0) {
      return;
    }

    this.logger.log({
      count: expiredLocks.length,
      action: 'inventory.expired-locks.releasing',
    });

    await this.prisma.$transaction(async (tx) => {
      for (const lock of expiredLocks) {
        await tx.inventoryLock.update({
          where: { id: lock.id },
          data: {
            status: 'expired',
            releasedAt: now,
          },
        });

        await this.recordStockMovement(
          {
            variantId: lock.variantId,
            storeId: lock.storeId,
            quantityChange: lock.quantity,
            type: 'ADJUSTMENT',
            reference: `lock-expired:${lock.id}`,
            notes: `Auto-released expired lock on ${lock.quantity} item(s)`,
          },
          tx,
        );

        // Restore inventory quantities after lock expiration
        await tx.inventorySummary.update({
          where: {
            variantId_storeId: {
              variantId: lock.variantId,
              storeId: lock.storeId,
            },
          },
          data: {
            quantityAvailable: { increment: lock.quantity },
            quantityLocked: { decrement: lock.quantity },
          },
        });
      }
    });

    this.logger.log({
      count: expiredLocks.length,
      action: 'inventory.expired-locks.released',
    });
  }

  /**
   * Record a stock movement entry. When called inside a transaction, pass the tx object.
   */
  async recordStockMovement(
    data: {
      variantId: string;
      storeId: string;
      quantityChange: number;
      type: string;
      reference?: string;
      notes?: string;
      createdByAdminId?: string;
    },
    tx?: unknown,
  ): Promise<void> {
    const prisma = tx ?? this.prisma;
    await (prisma as typeof this.prisma).stockMovement.create({
      data: {
        variantId: data.variantId,
        storeId: data.storeId,
        quantityChange: data.quantityChange,
        type: data.type as never,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        createdByAdminId: data.createdByAdminId ?? null,
      },
    });
  }

  /**
   * Get paginated stock movements with filters.
   */
  async getMovements(params: {
    variantId?: string;
    storeId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.variantId) where.variantId = params.variantId;
    if (params.storeId) where.storeId = params.storeId;
    if (params.type) where.type = params.type;

    if (params.startDate || params.endDate) {
      const createdAt: Record<string, Date> = {};
      if (params.startDate) createdAt.gte = new Date(params.startDate);
      if (params.endDate) createdAt.lte = new Date(params.endDate);
      where.createdAt = createdAt;
    }

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              size: true,
              color: true,
              product: { select: { id: true, name: true } },
            },
          },
          store: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Manually adjust stock for a variant at a store.
   * Updates InventorySummary, records a StockMovement, and returns the updated summary.
   */
  async adjustStock(
    variantId: string,
    storeId: string,
    quantityChange: number,
    type: string,
    notes: string | undefined,
    adminId: string | null,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const store = await this.prisma.storeLocation.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert the inventory summary and atomically update the available quantity
      const summary = await tx.inventorySummary.upsert({
        where: {
          variantId_storeId: { variantId, storeId },
        },
        create: {
          variantId,
          storeId,
          quantityAvailable: Math.max(0, quantityChange),
          quantityReserved: 0,
          quantitySold: 0,
        },
        update: {
          quantityAvailable: {
            increment: quantityChange,
          },
        },
      });

      // Ensure we never go negative
      if (summary.quantityAvailable < 0) {
        throw new BadRequestException(
          `Insufficient stock: adjustment of ${quantityChange} would make quantity negative`,
        );
      }

      // Record the movement
      await this.recordStockMovement(
        {
          variantId,
          storeId,
          quantityChange,
          type,
          reference: `adjustment:${type}`,
          notes:
            notes ??
            (adminId
              ? `Manual stock adjustment by admin ${adminId}`
              : 'Manual stock adjustment (system)'),
          createdByAdminId: adminId ?? undefined,
        },
        tx,
      );

      return tx.inventorySummary.findUnique({
        where: {
          variantId_storeId: { variantId, storeId },
        },
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              size: true,
              color: true,
              product: { select: { id: true, name: true } },
            },
          },
          store: { select: { id: true, name: true } },
        },
      });
    });

    this.logger.log({
      adminId,
      variantId,
      storeId,
      quantityChange,
      type,
      action: 'inventory.stock.adjusted',
    });

    return result;
  }

  /**
   * Get all inventory items where quantityAvailable <= lowStockThreshold.
   */
  async getLowStockItems(storeId?: string) {
    const query = storeId
      ? this.prisma.$queryRaw<
          Array<{
            variant_id: string;
            store_id: string;
            quantity_available: number;
            quantity_reserved: number;
            quantity_locked: number;
            quantity_sold: number;
            low_stock_threshold: number;
            updated_at: Date;
          }>
        >`
          SELECT * FROM inventory_summary
          WHERE quantity_available <= low_stock_threshold
            AND store_id = ${storeId}::text
          ORDER BY quantity_available ASC, updated_at DESC
        `
      : this.prisma.$queryRaw<
          Array<{
            variant_id: string;
            store_id: string;
            quantity_available: number;
            quantity_reserved: number;
            quantity_locked: number;
            quantity_sold: number;
            low_stock_threshold: number;
            updated_at: Date;
          }>
        >`
          SELECT * FROM inventory_summary
          WHERE quantity_available <= low_stock_threshold
          ORDER BY quantity_available ASC, updated_at DESC
        `;

    const items = await query;

    // Fetch variant and store details for each row
    const variantIds = [...new Set(items.map((i) => i.variant_id))];
    const storeIds = [...new Set(items.map((i) => i.store_id))];

    const [variants, stores] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          salePrice: true,
          isActive: true,
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.storeLocation.findMany({
        where: { id: { in: storeIds } },
        select: { id: true, name: true },
      }),
    ]);

    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const storeMap = new Map(stores.map((s) => [s.id, s]));

    const enrichedItems = items.map((item) => ({
      variantId: item.variant_id,
      storeId: item.store_id,
      quantityAvailable: item.quantity_available,
      quantityReserved: item.quantity_reserved,
      quantityLocked: item.quantity_locked,
      quantitySold: item.quantity_sold,
      lowStockThreshold: item.low_stock_threshold,
      updatedAt: item.updated_at,
      variant: variantMap.get(item.variant_id) ?? null,
      store: storeMap.get(item.store_id) ?? null,
    }));

    return {
      items: enrichedItems,
      meta: {
        total: enrichedItems.length,
      },
    };
  }

  async getAuditLogs(params: {
    entity?: string;
    entityId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.entity) where.entity = params.entity;
    if (params.entityId) where.entityId = params.entityId;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          admin: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
