import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'rr-fashion-jwt-secret-dev',
  jwtAdminSecret: process.env.JWT_ADMIN_SECRET || 'rr-fashion-admin-jwt-secret-dev',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtAdminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
  refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000,
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  otpHashSecret: process.env.AUTH_OTP_HASH_SECRET || 'rr-fashion-otp-secret',
  otpTtlMs: parseInt(process.env.AUTH_OTP_TTL_MS || '600000', 10),
}));
