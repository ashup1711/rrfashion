import { registerAs } from '@nestjs/config';

const DEV_JWT_SECRET = 'rr-fashion-jwt-secret-dev';
const DEV_ADMIN_JWT_SECRET = 'rr-fashion-admin-jwt-secret-dev';
const DEV_OTP_HASH_SECRET = 'rr-fashion-otp-secret';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * REQ-SEC-003 / SEC-18: In production, refuse to start with unset secrets or
 * the in-code dev fallbacks (these are publicly known values). In non-production
 * log a startup warning whenever a dev fallback is actually in use so the
 * operator notices before a release build.
 */
function assertSecret(value: string | undefined, devDefault: string, name: string): string {
  if (isProduction) {
    if (!value) {
      throw new Error(`[SEC-18] ${name} must be set in production. Refusing to start.`);
    }
    if (value === devDefault) {
      throw new Error(`[SEC-18] ${name} still equals the known dev default. Refusing to start.`);
    }
    return value;
  }
  if (!value || value === devDefault) {
    // eslint-disable-next-line no-console
    console.warn(`[SEC-18] ${name} is using the dev fallback (NODE_ENV != production).`);
  }
  return value || devDefault;
}

export const authConfig = registerAs('auth', () => ({
  jwtSecret: assertSecret(process.env.JWT_SECRET, DEV_JWT_SECRET, 'JWT_SECRET'),
  jwtAdminSecret: assertSecret(
    process.env.JWT_ADMIN_SECRET,
    DEV_ADMIN_JWT_SECRET,
    'JWT_ADMIN_SECRET',
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtAdminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
  refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000,
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  otpHashSecret: assertSecret(
    process.env.AUTH_OTP_HASH_SECRET,
    DEV_OTP_HASH_SECRET,
    'AUTH_OTP_HASH_SECRET',
  ),
  otpTtlMs: parseInt(process.env.AUTH_OTP_TTL_MS || '600000', 10),
}));
