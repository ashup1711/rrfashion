import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { InventoryService } from '../inventory/inventory.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { SyncMutationDto } from './dto/sync-mutation.dto';
import { PosOrderDto } from './dto/pos-order.dto';

interface InventorySummaryLock {
  variantId: string;
  storeId: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityLocked: number;
  quantitySold: number;
  updatedAt: Date;
}

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly inventoryService: InventoryService,
  ) {}

  async registerDevice(dto: RegisterDeviceDto, registeredByAdminId: string) {
    const apiKey = randomBytes(32).toString('hex');
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    const device = await this.prisma.posDevice.create({
      data: {
        storeId: dto.storeId,
        deviceName: dto.deviceName,
        deviceUuid: dto.deviceUuid,
        apiKeyHash,
        registeredByAdminId,
      },
    });

    return {
      deviceId: device.id,
      deviceUuid: device.deviceUuid,
      apiKey,
      message: 'Save this API key — it will not be shown again',
    };
  }

  async syncMutations(deviceUuid: string, dto: SyncMutationDto) {
    const results: Array<{
      clientUuid: string;
      status: string;
      error?: string;
      entity?: string;
      data?: unknown;
    }> = [];

    for (const mutation of dto.mutations) {
      const dedupKey = `pos:sync:${deviceUuid}:${mutation.clientUuid}`;
      const alreadyProcessed = await this.redis.setLock(dedupKey, 86400);

      if (!alreadyProcessed) {
        results.push({ clientUuid: mutation.clientUuid, status: 'deduped' });
        continue;
      }

      try {
        switch (mutation.entity) {
          case 'order':
            await this.processOrderMutation(deviceUuid, mutation);
            break;
          case 'lock':
            await this.processLockMutation(deviceUuid, mutation);
            break;
          case 'return':
            await this.processReturnMutation(deviceUuid, mutation);
            break;
          default:
            results.push({ clientUuid: mutation.clientUuid, status: 'unknown_entity' });
            continue;
        }
        results.push({ clientUuid: mutation.clientUuid, status: 'applied' });
      } catch (error) {
        this.logger.error(`Sync mutation failed: ${mutation.clientUuid}`, error);
        results.push({
          clientUuid: mutation.clientUuid,
          status: 'conflict',
          error: (error as Error).message,
          entity: mutation.entity,
          data: mutation.data,
        });
      }
    }

    await this.prisma.posDevice.update({
      where: { deviceUuid },
      data: { lastSyncedAt: new Date() },
    });

    return { synced: results.length, results };
  }

  async createOrder(deviceUuid: string, dto: PosOrderDto) {
    const dedupKey = `pos:order:${deviceUuid}:${dto.clientUuid}`;
    const alreadyProcessed = await this.redis.setLock(dedupKey, 86400);

    if (!alreadyProcessed) {
      throw new BadRequestException('Duplicate order (already synced)');
    }

    const device = await this.prisma.posDevice.findUnique({
      where: { deviceUuid },
    });
    if (!device) throw new BadRequestException('Device not found');

    const storeId = dto.storeId || device.storeId;

    // Aggregate quantities per variant so a single transaction can lock and decrement stock.
    const variantQuantityMap = new Map<string, number>();
    for (const item of dto.items) {
      const current = variantQuantityMap.get(item.variantId) ?? 0;
      variantQuantityMap.set(item.variantId, current + item.quantity);
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: `POS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          userId: '00000000-0000-0000-0000-000000000000',
          status: 'CONFIRMED',
          totalAmount: dto.totalAmount || 0,
          subtotal: dto.totalAmount || 0,
          channel: 'offline',
          storeId,
          paymentStatus: 'PAID',
          items: {
            create: dto.items.map((item) => ({
              productId: item.variantId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice || 0,
              totalPrice: (item.unitPrice || 0) * item.quantity,
              subtotal: (item.unitPrice || 0) * item.quantity,
              type: item.type,
              rentStart: item.rentStart ? new Date(item.rentStart) : null,
              rentEnd: item.rentEnd ? new Date(item.rentEnd) : null,
            })),
          },
        },
      });

      const variantIds = Array.from(variantQuantityMap.keys()).sort();
      for (const variantId of variantIds) {
        const qty = variantQuantityMap.get(variantId) ?? 0;

        const locked = await tx.$queryRaw<Array<InventorySummaryLock>>`
          SELECT * FROM inventory_summary
          WHERE "variantId" = ${variantId} AND "storeId" = ${storeId}
          FOR UPDATE;
        `;

        const summary = locked[0];

        if (!summary || summary.quantityAvailable < qty) {
          throw new ConflictException(
            `Item is no longer available in the requested quantity. variantId=${variantId}`,
          );
        }

        await tx.inventorySummary.update({
          where: { variantId_storeId: { variantId, storeId } },
          data: {
            quantityAvailable: { decrement: qty },
            quantitySold: { increment: qty },
          },
        });
      }

      return created;
    });

    return order;
  }

  async getStoreInventory(storeId: string, search?: string, limit = 100) {
    const where: Prisma.InventorySummaryWhereInput = {
      storeId,
      quantityAvailable: { gt: 0 },
      variant: {
        isActive: true,
        deletedAt: null,
        product: { isActive: true, deletedAt: null },
      },
    };

    if (search) {
      where.variant = {
        ...(where.variant as object),
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const summaries = await this.prisma.inventorySummary.findMany({
      where,
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
              select: {
                id: true,
                name: true,
                basePrice: true,
                salePrice: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      items: summaries.map((s) => ({
        variantId: s.variantId,
        productId: s.variant.product.id,
        productName: s.variant.product.name,
        sku: s.variant.sku,
        size: s.variant.size,
        color: s.variant.color,
        salePrice: Number(
          s.variant.salePrice ?? s.variant.product.salePrice ?? s.variant.product.basePrice ?? 0,
        ),
        quantityAvailable: s.quantityAvailable - s.quantityLocked,
        images: s.variant.product.images,
      })),
      meta: { total: summaries.length },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async processOrderMutation(deviceUuid: string, mutation: any) {
    const data = mutation.data as Record<string, unknown>;
    const orderDto: PosOrderDto = data as unknown as PosOrderDto;
    orderDto.clientUuid = mutation.clientUuid;
    await this.createOrder(deviceUuid, orderDto);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async processLockMutation(deviceUuid: string, mutation: any) {
    const data = mutation.data as Record<string, unknown>;

    // Delegate to InventoryService.createLock which handles:
    // - variant existence check
    // - stock availability validation
    // - atomic inventory decrement (quantityAvailable--, quantityLocked++)
    // - stock movement audit trail
    // - 24-hour TTL with proper status (lowercase 'active' matching cron expectations)
    await this.inventoryService.createLock(
      {
        variantId: data.variantId as string,
        storeId: data.storeId as string,
        deviceId: deviceUuid,
        quantity: (data.quantity as number) ?? 1,
        reason: (data.reason as string) || 'POS in-store lock',
      },
      '00000000-0000-0000-0000-000000000000',
      mutation.clientUuid,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async processReturnMutation(deviceUuid: string, mutation: any) {
    const data = mutation.data as Record<string, unknown>;

    const order = await this.prisma.order.findFirst({
      where: { orderNumber: data.orderNumber as string },
    });

    if (!order) {
      throw new BadRequestException('Order not found for return');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'RETURNED' },
    });
  }
}
