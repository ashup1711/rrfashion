import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RentalBookingStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async dashboard(view: 'day' | 'week' | 'month' | 'year') {
    const { startDate, endDate, previousStart } = this.getDateRange(view);

    const [currentPeriod, previousPeriod, activeRentals, totalCustomers, totalProducts] =
      await Promise.all([
        this.aggregateOrders(startDate, endDate),
        this.aggregateOrders(previousStart, startDate),
        this.getActiveRentalsCount(),
        this.getTotalCustomersCount(),
        this.getTotalProductsCount(),
      ]);

    return {
      totalRevenue: currentPeriod.revenue,
      totalOrders: currentPeriod.orderCount,
      averageOrderValue: currentPeriod.avgOrderValue,
      totalCustomers,
      totalProducts,
      activeRentals,
      revenueGrowth: this.calcGrowth(currentPeriod.revenue, previousPeriod.revenue),
      ordersGrowth: this.calcGrowth(currentPeriod.orderCount, previousPeriod.orderCount),
    };
  }

  private async getActiveRentalsCount(): Promise<number> {
    return this.prisma.rentalBooking.count({ where: { status: RentalBookingStatus.IN_USE } });
  }

  private async getTotalCustomersCount(): Promise<number> {
    return this.prisma.user.count({ where: { role: 'CUSTOMER' } });
  }

  private async getTotalProductsCount(): Promise<number> {
    return this.prisma.product.count({ where: { isActive: true } });
  }

  async revenueChart(
    view: 'day' | 'week' | 'month' | 'year',
  ): Promise<Array<{ date: string; revenue: number; orders: number; label?: string }>> {
    const { startDate, endDate } = this.getDateRange(view);

    const truncExpr =
      view === 'day' ? 'hour' : view === 'week' ? 'day' : view === 'month' ? 'day' : 'month';

    const result = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT
        DATE_TRUNC('${truncExpr}', "createdAt") as date,
        COALESCE(SUM("totalAmount"), 0) as revenue,
        COUNT(*)::int as orders
      FROM orders
      WHERE "createdAt" >= $1::timestamptz AND "createdAt" < $2::timestamptz
        AND status NOT IN ('CANCELLED')
      GROUP BY DATE_TRUNC('${truncExpr}', "createdAt")
      ORDER BY date ASC`,
      startDate,
      endDate,
    );

    return result.map((row) => ({
      date: row.date instanceof Date ? row.date.toISOString() : String(row.date),
      revenue: Number(row.revenue || 0),
      orders: Number(row.orders || 0),
      label: this.formatDateLabel(row.date, view),
    }));
  }

  private formatDateLabel(date: unknown, view: string): string {
    const d = date instanceof Date ? date : new Date(String(date));
    switch (view) {
      case 'day':
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      case 'week':
      case 'month':
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      case 'year':
        return d.toLocaleDateString(undefined, { month: 'short' });
      default:
        return d.toLocaleDateString();
    }
  }

  async topProducts(
    startDate: Date,
    endDate: Date,
    limit = 10,
    filters?: { categoryId?: string; brandId?: string; channel?: string },
  ) {
    const conditions = [`o."createdAt" >= $1::timestamptz`, `o."createdAt" < $2::timestamptz`];
    const params: unknown[] = [startDate, endDate];
    let paramIdx = 3;

    if (filters?.categoryId) {
      conditions.push(`p."categoryId" = $${paramIdx}::text`);
      params.push(filters.categoryId);
      paramIdx++;
    }
    if (filters?.brandId) {
      conditions.push(`p."brandId" = $${paramIdx}::text`);
      params.push(filters.brandId);
      paramIdx++;
    }

    const typeFilter =
      filters?.channel === 'rent'
        ? ` AND oi.type = 'rent'`
        : filters?.channel === 'sale'
          ? ` AND oi.type = 'sale'`
          : '';

    const query = `
      SELECT
        p.id, p.name, p.slug, p.fabric,
        p."hsnCode" as hsn_code,
        COALESCE(SUM(oi.quantity), 0)::int as units_sold,
        COALESCE(SUM(oi."totalPrice"), 0) as revenue,
        (
          SELECT pi.url
          FROM product_images pi
          JOIN product_variants pv ON pv.id = pi."variantId"
          WHERE pv."productId" = p.id
          ORDER BY pi."sortOrder" ASC
          LIMIT 1
        ) as image
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      JOIN products p ON p.id = oi."productId"
      WHERE ${conditions.join(' AND ')} ${typeFilter}
        AND o.status NOT IN ('CANCELLED')
      GROUP BY p.id, p.name, p.slug, p.fabric, p."hsnCode"
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    const result = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      query,
      ...params,
    );
    return result.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      totalSold: Number(row.units_sold || 0),
      totalRevenue: Number(row.revenue || 0),
      image: row.image ? String(row.image) : undefined,
    }));
  }

  async exportData(
    reportType: string,
    format: 'pdf' | 'xlsx',
    parameters: Record<string, unknown>,
  ) {
    const { startDate, endDate } = this.parseDateParams(parameters);

    switch (reportType) {
      case 'sales': {
        const orders = await this.aggregateOrders(startDate, endDate);
        const items = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT
            o."orderNumber", oi.type, p.name as product_name,
            pv.sku, oi.quantity, oi."unitPrice", oi."totalPrice",
            oi."cgstAmount", oi."sgstAmount", oi."igstAmount",
            oi."depositAmount", o."createdAt"
          FROM order_items oi
          JOIN orders o ON o.id = oi."orderId"
          JOIN products p ON p.id = oi."productId"
          LEFT JOIN product_variants pv ON pv.id = oi."variantId"
          WHERE o."createdAt" >= $1::timestamptz AND o."createdAt" < $2::timestamptz
          ORDER BY o."createdAt" DESC`,
          startDate,
          endDate,
        );
        return { summary: orders, items };
      }

      case 'inventory':
        return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT p.name, pv.sku, pv.size, pv.color,
            ius.status, COUNT(*) as count
          FROM inventory_units ius
          JOIN product_variants pv ON pv.id = ius."variantId"
          JOIN products p ON p.id = pv."productId"
          GROUP BY p.name, pv.sku, pv.size, pv.color, ius.status
          ORDER BY p.name`,
        );

      case 'rentals':
        return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT rb.id, rb.status, rb."depositAmount", rb."lateFee",
            rb."damageCharge", rb."bookedAt", rb."dueReturnAt",
            rb."actualReturnAt", p.name as product_name, pv.sku
          FROM rental_bookings rb
          JOIN inventory_units iu ON iu.id = rb."unitId"
          JOIN product_variants pv ON pv.id = iu."variantId"
          JOIN products p ON p.id = pv."productId"
          ORDER BY rb."createdAt" DESC`,
        );

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  private async aggregateOrders(startDate: Date, endDate: Date) {
    const result = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT
        COUNT(*)::int as order_count,
        COALESCE(SUM("totalAmount"), 0) as revenue,
        COALESCE(AVG("totalAmount"), 0) as avg_order_value,
        COUNT(*) FILTER (WHERE channel = 'online')::int as online_orders,
        COUNT(*) FILTER (WHERE channel = 'offline')::int as offline_orders
      FROM orders
      WHERE "createdAt" >= $1::timestamptz AND "createdAt" < $2::timestamptz
        AND status NOT IN ('CANCELLED')`,
      startDate,
      endDate,
    );

    const row = result[0] || {};
    return {
      orderCount: Number(row.order_count || 0),
      revenue: Number(row.revenue || 0),
      avgOrderValue: Number(row.avg_order_value || 0),
      onlineOrders: Number(row.online_orders || 0),
      offlineOrders: Number(row.offline_orders || 0),
    };
  }

  private async channelSplit(startDate: Date, endDate: Date) {
    const result = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT
        channel,
        COUNT(*)::int as orders,
        COALESCE(SUM("totalAmount"), 0) as revenue
      FROM orders
      WHERE "createdAt" >= $1::timestamptz AND "createdAt" < $2::timestamptz
        AND status NOT IN ('CANCELLED')
      GROUP BY channel`,
      startDate,
      endDate,
    );
    return result;
  }

  private async typeSplit(startDate: Date, endDate: Date) {
    const result = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT
        type,
        COUNT(*)::int as items,
        COALESCE(SUM("totalPrice"), 0) as revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      WHERE o."createdAt" >= $1::timestamptz AND o."createdAt" < $2::timestamptz
        AND o.status NOT IN ('CANCELLED')
      GROUP BY type`,
      startDate,
      endDate,
    );
    return result;
  }

  getDateRange(view: string) {
    const now = new Date();
    let startDate: Date;
    const endDate = new Date(now);
    let previousStart: Date;

    switch (view) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStart = new Date(startDate);
        previousStart.setDate(previousStart.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        previousStart = new Date(startDate);
        previousStart.setDate(previousStart.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(startDate);
        previousStart.setMonth(previousStart.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStart = new Date(startDate);
        previousStart.setFullYear(previousStart.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(startDate);
        previousStart.setMonth(previousStart.getMonth() - 1);
    }

    return { startDate, endDate, previousStart };
  }

  private parseDateParams(params: Record<string, unknown>) {
    const now = new Date();
    return {
      startDate: params.startDate
        ? new Date(params.startDate as string)
        : new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: params.endDate ? new Date(params.endDate as string) : now,
    };
  }

  async createReport(
    requestedByAdminId: string,
    reportType: string,
    format: string,
    parameters: Record<string, unknown>,
  ) {
    return this.prisma.reportExport.create({
      data: {
        requestedByAdminId,
        reportType,
        format,
        parameters: parameters as any,
        status: 'PROCESSING',
      },
    });
  }

  private calcGrowth(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }
}
