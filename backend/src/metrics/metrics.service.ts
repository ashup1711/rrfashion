import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  inventoryConflicts: Counter<string>;
  posSyncLag: Gauge<string>;
  orderProcessingDuration: Histogram<string>;
  rentalStatus: Gauge<string>;
  webhookProcessing: Counter<string>;
  cacheOperations: Counter<string>;
  httpRequestDuration: Histogram<string>;
  httpRequestsTotal: Counter<string>;
  dbQueryDuration: Histogram<string>;
  posPendingOutbox: Gauge<string>;
  rentalOverdueTotal: Counter<string>;

  onModuleInit() {
    register.clear();

    this.httpRequestsTotal = new Counter({
      name: 'rrfashion_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'rrfashion_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    });

    this.dbQueryDuration = new Histogram({
      name: 'rrfashion_db_query_duration_seconds',
      help: 'Database query duration',
      labelNames: ['query_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    this.inventoryConflicts = new Counter({
      name: 'rrfashion_inventory_conflict_total',
      help: 'Total inventory conflicts detected',
      labelNames: ['conflict_type'],
    });

    this.posSyncLag = new Gauge({
      name: 'rrfashion_pos_sync_lag_seconds',
      help: 'Current POS sync lag in seconds',
      labelNames: ['device_id', 'store_id'],
    });

    this.orderProcessingDuration = new Histogram({
      name: 'rrfashion_order_processing_duration_seconds',
      help: 'Order processing duration',
      labelNames: ['order_type', 'channel'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
    });

    this.rentalStatus = new Gauge({
      name: 'rrfashion_rental_bookings_by_status',
      help: 'Rental bookings by status',
      labelNames: ['status'],
    });

    this.webhookProcessing = new Counter({
      name: 'rrfashion_webhook_processed_total',
      help: 'Webhook events processed',
      labelNames: ['provider', 'event_type', 'status'],
    });

    this.cacheOperations = new Counter({
      name: 'rrfashion_cache_operations_total',
      help: 'Cache operation results',
      labelNames: ['operation', 'result'],
    });

    this.posPendingOutbox = new Gauge({
      name: 'rrfashion_pos_pending_outbox_count',
      help: 'Pending outbox items per POS device',
      labelNames: ['device_id'],
    });

    this.rentalOverdueTotal = new Counter({
      name: 'rrfashion_rental_overdue_total',
      help: 'Total rental bookings that went overdue',
      labelNames: ['store_id'],
    });
  }

  getMetrics() {
    return register.metrics();
  }
}
