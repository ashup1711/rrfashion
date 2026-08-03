import { registerAs } from '@nestjs/config';

/**
 * Runtime-validated environment configuration (SEC-18).
 * Values are read from process.env with safe defaults; secrets are never
 * logged and production startup fails when insecure dev fallbacks are used
 * (see auth.config.ts).
 */
export const envConfig = registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  // REQ-BE-014: per-route upload size caps (bytes)
  uploadMaxFileSizeBytes: parseInt(process.env.UPLOAD_MAX_FILE_SIZE_BYTES || '5242880', 10),
  uploadMaxProfileSizeBytes: parseInt(process.env.UPLOAD_MAX_PROFILE_SIZE_BYTES || '2097152', 10),
  // REQ-BE-011: pwned-passwords (HIBP) breach check toggle
  hibpEnabled: (process.env.HIBP_ENABLED ?? 'true') === 'true',
  // REQ-BE-015: daily stock reconciliation cron expression (IST 03:00 default)
  stockReconCron: process.env.STOCK_RECON_CRON || '0 30 3 * * *',
  // REQ-BE-004: cart abandonment scan cron expression (every 6 hours default)
  cartAbandonmentCron: process.env.CART_ABANDONMENT_CRON || '0 */6 * * *',
}));
