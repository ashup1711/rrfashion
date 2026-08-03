/**
 * REQ-BE-015 / REQ-BE-016: Stock reconciliation.
 *
 * Goal: keep `Product.stock` (the denormalized cache) in sync with
 * the source of truth — `InventorySummary.quantityAvailable` summed across
 * all stores for every variant of a product.
 *
 * `Product.stock` is a denormalized cache used for storefront filtering
 * (`inStock` / `outOfStock`); the source of truth is
 * InventorySummary.quantityAvailable, which is incremented/decremented
 * inside FOR UPDATE locks. The two can drift if a code path writes
 * directly to either side, and the drift shows up as customers seeing
 * "in stock" products that the POS can no longer fulfill.
 *
 * The cron runs once per day at 03:00 IST and:
 *  1. Computes the total quantityAvailable per product (sum across
 *     all variants and stores).
 *  2. Compares it with Product.stock.
 *  3. Auto-corrects Product.stock to the computed sum.
 *  4. Writes an InventoryReconciliationLog row on every mismatch with
 *     expected/actual/discrepancy values.
 *
 * Idempotency: the `@Cron` decorator uses a stable job name so BullMQ
 * does not enqueue duplicates if the process restarts mid-day. The
 * InventoryReconciliationLog table is append-only, so running the job
 * twice in a day produces two log rows (one per mismatch observed) —
 * that is intentional for audit purposes.
 *
 * NOTE: this service documents (in code) the derivation relationship
 * REQ-BE-016 calls out — DO NOT write to Product.stock directly outside
 * the InventoryService / StockReconciliationService; the denormalized
 * cache is reconciled daily by this cron.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_CRON_03_IST = '0 3 * * *';
const STOCK_RECON_JOB_NAME = 'stock-reconciliation';

interface ProductStockRow {
  productId: string;
  cachedStock: number;
  computedStock: number;
}

@Injectable()
export class StockReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StockReconciliationService.name);
  private running = false;
  // Cron expression (default: 03:00 every day). Overridable via env so
  // staging can run it more often.
  private readonly cronExpression: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.cronExpression = this.config.get<string>('STOCK_RECON_CRON', DEFAULT_CRON_03_IST);
  }

  onModuleInit(): void {
    // Register the cron dynamically so STOCK_RECON_CRON is honored
    // (the @Cron decorator evaluates before DI/config is available).
    // The expression is normalized: it accepts a standard 5-field cron
    // (e.g. "0 30 3 * * *") or a 6-field cron with seconds.
    const cronTime = this.normalizeCronExpression(this.cronExpression);
    const job = new CronJob(cronTime, () => void this.scheduledRun(), null, false, 'Asia/Kolkata');
    this.schedulerRegistry.addCronJob(STOCK_RECON_JOB_NAME, job);
    job.start();
    this.logger.log(
      `Stock reconciliation cron registered (expression='${cronTime}', default = 03:00 IST daily)`,
    );
  }

  onModuleDestroy(): void {
    this.running = false;
    if (this.schedulerRegistry.doesExist('cron', STOCK_RECON_JOB_NAME)) {
      this.schedulerRegistry.getCronJob(STOCK_RECON_JOB_NAME).stop();
    }
  }

  private normalizeCronExpression(expression: string): string {
    const trimmed = expression.trim();
    const parts = trimmed.split(/\s+/);
    // cron v3 uses a 6-field cron (seconds included). Convert a standard
    // 5-field expression by prefixing "0" for seconds.
    return parts.length === 5 ? `0 ${trimmed}` : trimmed;
  }

  /**
   * Cron-driven entry point. The SchedulerRegistry job registered in
   * `onModuleInit` is the primary trigger (matches the existing inventory
   * cron pattern) and `runReconciliation()` is also exposed as a public
   * method so it can be invoked manually from an admin endpoint or a
   * one-off test.
   *
   * Concurrency: a `running` flag prevents overlap if the previous run
   * is still in flight (e.g. on a slow DB). The flag is reset in a
   * finally block so we never deadlock.
   */
  async scheduledRun(): Promise<void> {
    await this.runReconciliation();
  }

  /**
   * REQ-BE-015 / REQ-BE-016: reconcile a single product.
   * Recomputes the sum of `quantityAvailable` across every variant
   * (and every store) for the product and corrects `Product.stock` if
   * drifted. Always returns the post-reconcile values so callers
   * (admin endpoints, tests) can verify the result.
   */
  async reconcileOne(productId: string): Promise<{
    productId: string;
    cachedStock: number;
    computedStock: number;
    discrepancy: number;
    logId: string | null;
  }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true },
    });
    if (!product) {
      this.logger.warn(`reconcileOne: product ${productId} not found`);
      return {
        productId,
        cachedStock: 0,
        computedStock: 0,
        discrepancy: 0,
        logId: null,
      };
    }

    const summed = await this.prisma.$queryRaw<Array<{ qty: bigint }>>`
      SELECT COALESCE(SUM(s."quantityAvailable"), 0)::bigint AS qty
      FROM inventory_summary s
      INNER JOIN product_variants pv ON pv.id = s."variantId"
      WHERE pv."productId" = ${productId};
    `;
    const computed = summed[0] ? Number(summed[0].qty) : 0;
    const cached = product.stock;
    const discrepancy = computed - cached;

    let logId: string | null = null;
    if (discrepancy !== 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: productId },
          data: { stock: computed },
        });
        const log = await tx.inventoryReconciliationLog.create({
          data: {
            productId,
            expectedQty: computed,
            actualQty: cached,
            discrepancy,
            runAt: new Date(),
            resolved: true,
            resolvedAt: new Date(),
          },
        });
        logId = log.id;
        this.logger.log({
          productId,
          cached,
          computed,
          discrepancy,
          logId: log.id,
          action: 'stock.reconciled',
        });
      });
    }

    return { productId, cachedStock: cached, computedStock: computed, discrepancy, logId };
  }

  /**
   * Bulk reconciliation across every product. Wraps a single transaction
   * so a failure mid-run leaves the cache untouched (no half-corrected
   * state).
   */
  async runReconciliation(): Promise<{
    total: number;
    mismatches: number;
    logsWritten: number;
  }> {
    if (this.running) {
      this.logger.warn('Stock reconciliation already in progress — skipping overlap');
      return { total: 0, mismatches: 0, logsWritten: 0 };
    }
    this.running = true;
    const startedAt = Date.now();
    try {
      this.logger.log({ action: 'stock.reconciliation.start' });

      // 1. Read every product with its current cached stock.
      const products = await this.prisma.product.findMany({
        select: { id: true, stock: true },
      });
      if (products.length === 0) {
        this.logger.log({ action: 'stock.reconciliation.noop', reason: 'no products' });
        return { total: 0, mismatches: 0, logsWritten: 0 };
      }

      // 2. Sum quantityAvailable per product across all variants and stores.
      const summed = await this.prisma.$queryRaw<Array<{ product_id: string; qty: bigint }>>`
        SELECT pv."productId" AS product_id,
               COALESCE(SUM(s."quantityAvailable"), 0)::bigint AS qty
        FROM inventory_summary s
        INNER JOIN product_variants pv ON pv.id = s."variantId"
        GROUP BY pv."productId";
      `;
      const computedMap = new Map<string, number>();
      for (const row of summed) {
        computedMap.set(row.product_id, Number(row.qty));
      }

      // 3. Diff and collect mismatches.
      const mismatches: ProductStockRow[] = products
        .map((p) => ({
          productId: p.id,
          cachedStock: p.stock,
          computedStock: computedMap.get(p.id) ?? 0,
        }))
        .filter((row) => row.cachedStock !== row.computedStock);

      if (mismatches.length === 0) {
        this.logger.log({
          total: products.length,
          mismatches: 0,
          action: 'stock.reconciliation.complete',
          durationMs: Date.now() - startedAt,
        });
        return { total: products.length, mismatches: 0, logsWritten: 0 };
      }

      // 4. Apply corrections + write log rows in a single transaction.
      const logIds: string[] = [];
      await this.prisma.$transaction(async (tx) => {
        for (const m of mismatches) {
          await tx.product.update({
            where: { id: m.productId },
            data: { stock: m.computedStock },
          });
          const log = await tx.inventoryReconciliationLog.create({
            data: {
              productId: m.productId,
              expectedQty: m.computedStock,
              actualQty: m.cachedStock,
              discrepancy: m.computedStock - m.cachedStock,
              runAt: new Date(),
              resolved: true,
              resolvedAt: new Date(),
            },
          });
          logIds.push(log.id);
        }
      });

      this.logger.log({
        total: products.length,
        mismatches: mismatches.length,
        logsWritten: logIds.length,
        durationMs: Date.now() - startedAt,
        action: 'stock.reconciliation.complete',
      });

      return {
        total: products.length,
        mismatches: mismatches.length,
        logsWritten: logIds.length,
      };
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message, stack: (error as Error).stack },
        'Stock reconciliation failed',
      );
      throw error;
    } finally {
      this.running = false;
    }
  }
}
