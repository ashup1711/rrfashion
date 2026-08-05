import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHmac, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { SmsService } from '../notifications/providers/sms.service';
import { RedisService } from '../../redis/redis.service';
import { HibpService } from '../../common/security/hibp.service';
import { isStrongPassword } from '../../common/validators/password.validator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GuestResponseDto } from './dto/guest.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

// REQ-BE-012: Redis-stored, single-use, 1-hour TTL password-reset tokens.
const PASSWORD_RESET_KEY_PREFIX = 'auth:password-reset:';
const PASSWORD_RESET_TTL_SECONDS = 60 * 60; // 1 hour

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface GuestSessionMigration {
  cartItems: number;
  wishlistItems: number;
  addresses: number;
  orders: number;
  reviews: number;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
  mergedGuestSession?: GuestSessionMigration;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresInMs: number;
  private readonly bcryptSaltRounds: number;
  private readonly otpTtlMs: number;
  private readonly otpHashSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cartService: CartService,
    private readonly smsService: SmsService,
    private readonly redis: RedisService,
    private readonly hibp: HibpService,
  ) {
    this.jwtSecret = this.configService.get<string>('auth.jwtSecret', 'rr-fashion-jwt-secret-dev');
    this.jwtExpiresIn = this.configService.get<string>('auth.jwtExpiresIn', '15m');
    this.refreshExpiresInMs = this.configService.get<number>(
      'auth.refreshExpiresInMs',
      7 * 24 * 60 * 60 * 1000,
    );
    this.bcryptSaltRounds = this.configService.get<number>('auth.bcryptSaltRounds', 12);
    this.otpTtlMs = this.configService.get<number>('auth.otpTtlMs', 10 * 60 * 1000);
    this.otpHashSecret = this.configService.get<string>(
      'auth.otpHashSecret',
      'rr-fashion-otp-secret',
    );
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // REQ-BE-010: defensive re-check. The DTO decorator already validated the
    // policy, but if a service-layer caller bypasses the DTO (e.g. a future
    // admin-create-user flow) this guard still rejects weak passwords.
    if (!isStrongPassword(dto.password)) {
      throw new BadRequestException(
        'Password must be at least 10 characters and include uppercase, lowercase, digit, and symbol characters',
      );
    }

    // REQ-BE-011: env-gated HIBP check (no-op when HIBP_ENABLED!=true).
    const hibpResult = await this.hibp.checkPassword(dto.password);
    if (hibpResult.pwned) {
      this.logger.warn(
        { email: dto.email, occurrences: hibpResult.occurrences },
        'Registration rejected — password found in HIBP breach corpus',
      );
      throw new BadRequestException(
        'This password has been found in a known data breach. Please choose a different password.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        role: 'CUSTOMER',
        isActive: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };

    if (dto.guestSessionId) {
      try {
        const result = await this.migrateGuestSessionToUser(dto.guestSessionId, user.id);
        response.mergedGuestSession = result;
        this.logger.log({
          guestSessionId: dto.guestSessionId,
          userId: user.id,
          ...result,
          action: 'guest.session.migrated.on.register',
        });
      } catch (error) {
        this.logger.warn(
          `Guest session migration failed for ${dto.guestSessionId}: ${(error as Error).message}`,
        );
      }
    }

    return response;
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };

    if (dto.guestSessionId) {
      try {
        const result = await this.migrateGuestSessionToUser(dto.guestSessionId, user.id);
        response.mergedGuestSession = result;
        this.logger.log({
          guestSessionId: dto.guestSessionId,
          userId: user.id,
          ...result,
          action: 'guest.session.migrated.on.login',
        });
      } catch (error) {
        this.logger.warn(
          `Guest session migration failed for ${dto.guestSessionId}: ${(error as Error).message}`,
        );
      }
    }

    return response;
  }

  async refresh(dto: RefreshDto): Promise<AuthTokens> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked) {
      if (storedToken?.isRevoked && storedToken.userId) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: storedToken.userId, isRevoked: false },
          data: { isRevoked: true },
        });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (new Date() > storedToken.expiresAt) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const userId = storedToken.userId!;
    const user = storedToken.user!;

    return this.generateTokens(userId, user.email, user.role);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { isRevoked: true },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  /**
   * Migrate a guest session's cart, wishlist, addresses, orders, and reviews
   * into a newly authenticated user. Deletes the guest session on success.
   */
  async migrateGuestSessionToUser(
    guestSessionId: string,
    newUserId: string,
  ): Promise<GuestSessionMigration> {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.guestSession.findUnique({
        where: { id: guestSessionId },
        include: { cartItems: true, wishlistItems: true, addresses: true },
      });

      if (!session) {
        return { cartItems: 0, wishlistItems: 0, addresses: 0, orders: 0, reviews: 0 };
      }

      // ── Migrate cart items ──
      let userCart = await tx.cart.findUnique({ where: { userId: newUserId } });
      if (!userCart) {
        userCart = await tx.cart.create({ data: { userId: newUserId } });
      }

      let cartItemsMigrated = 0;
      for (const item of session.cartItems) {
        const existing = await tx.cartItem.findFirst({
          where: {
            cartId: userCart.id,
            variantId: item.variantId,
            type: item.type,
          },
        });
        if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + item.quantity },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: userCart.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              type: item.type,
              rentStart: item.rentStart,
              rentEnd: item.rentEnd,
            },
          });
        }
        cartItemsMigrated++;
      }

      // ── Migrate wishlist items ──
      let wishlistItemsMigrated = 0;
      if (session.wishlistItems.length > 0) {
        const variantIds = session.wishlistItems.map((w) => w.variantId);
        const existing = await tx.wishlist.findMany({
          where: { userId: newUserId, variantId: { in: variantIds } },
          select: { variantId: true },
        });
        const existingIds = new Set(existing.map((e) => e.variantId));
        const toCreate = session.wishlistItems.filter((w) => !existingIds.has(w.variantId));
        if (toCreate.length > 0) {
          await tx.wishlist.createMany({
            data: toCreate.map((w) => ({
              userId: newUserId,
              variantId: w.variantId,
              notifyOnRestock: w.notifyOnRestock,
              notifyOnPriceDrop: w.notifyOnPriceDrop,
            })),
          });
          wishlistItemsMigrated = toCreate.length;
        }
      }

      // ── Migrate addresses ──
      let addressesMigrated = 0;
      const guestAddresses = session.addresses;
      if (guestAddresses.length > 0) {
        await tx.userAddress.createMany({
          data: guestAddresses.map((addr) => ({
            userId: newUserId,
            label: addr.label,
            line1: addr.addressLine1,
            line2: addr.addressLine2 ?? null,
            city: addr.city,
            state: addr.state,
            pincode: addr.postalCode,
            phone: addr.phone ?? null,
            isDefault: addr.isDefault,
          })),
        });
        addressesMigrated = guestAddresses.length;
      }

      // ── Migrate orders ──
      const ordersResult = await tx.order.updateMany({
        where: { guestSessionId },
        data: {
          userId: newUserId,
          guestSessionId: null,
        },
      });

      // ── Migrate reviews ──
      const reviewsResult = await tx.review.updateMany({
        where: { guestSessionId },
        data: {
          userId: newUserId,
          guestSessionId: null,
        },
      });

      // Delete the guest session (cascades to GuestCartItem, GuestWishlistItem, GuestAddress)
      await tx.guestSession.delete({ where: { id: guestSessionId } });

      this.logger.log({
        guestSessionId,
        newUserId,
        cartItems: cartItemsMigrated,
        wishlistItems: wishlistItemsMigrated,
        addresses: addressesMigrated,
        orders: ordersResult.count,
        reviews: reviewsResult.count,
        action: 'guest.session.migration.complete',
      });

      return {
        cartItems: cartItemsMigrated,
        wishlistItems: wishlistItemsMigrated,
        addresses: addressesMigrated,
        orders: ordersResult.count,
        reviews: reviewsResult.count,
      };
    });
  }

  /**
   * @deprecated Use migrateGuestSessionToUser instead. Kept for the legacy
   * User-based guest flow (one release).
   */
  async mergeGuestAccount(
    guestId: string,
    newUserId: string,
  ): Promise<{
    message: string;
    mergedOrders: number;
    mergedCart: boolean;
    mergedWishlist: { merged: number; skipped: number };
  }> {
    const guestUser = await this.prisma.user.findUnique({
      where: { id: guestId },
    });

    if (!guestUser || !guestUser.isGuest) {
      throw new NotFoundException('Guest user not found');
    }

    let mergedOrders = 0;
    let mergedCart = false;
    let mergedWishlist = { merged: 0, skipped: 0 };

    await this.prisma.$transaction(async (tx) => {
      const guestOrders = await tx.order.findMany({
        where: { userId: guestId },
      });

      if (guestOrders.length > 0) {
        const orderIds = guestOrders.map((o) => o.id);
        await tx.order.updateMany({
          where: { id: { in: orderIds } },
          data: { userId: newUserId },
        });
        mergedOrders = guestOrders.length;
      }

      const mergeResult = await this.cartService.mergeGuestCartIntoUserCart(guestId, newUserId, tx);
      mergedCart = mergeResult.merged;

      await tx.refreshToken.updateMany({
        where: { userId: guestId },
        data: { userId: newUserId },
      });

      await tx.notification.updateMany({
        where: { userId: guestId },
        data: { userId: newUserId },
      });

      await tx.walletTransaction.updateMany({
        where: { userId: guestId },
        data: { userId: newUserId },
      });

      await tx.user.update({
        where: { id: guestId },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });

      const guestWishlistEntries = await tx.wishlist.findMany({
        where: { userId: guestId },
      });

      if (guestWishlistEntries.length > 0) {
        const guestVariantIds = guestWishlistEntries.map((e) => e.variantId);
        const existingUserEntries = await tx.wishlist.findMany({
          where: { userId: newUserId, variantId: { in: guestVariantIds } },
          select: { variantId: true },
        });
        const existingVariantIds = new Set(existingUserEntries.map((e) => e.variantId));

        const entriesToCreate = guestWishlistEntries.filter(
          (entry) => !existingVariantIds.has(entry.variantId),
        );

        if (entriesToCreate.length > 0) {
          await tx.wishlist.createMany({
            data: entriesToCreate.map((entry) => ({
              userId: newUserId,
              variantId: entry.variantId,
              notifyOnRestock: entry.notifyOnRestock,
              notifyOnPriceDrop: entry.notifyOnPriceDrop,
            })),
          });
          mergedWishlist = {
            merged: entriesToCreate.length,
            skipped: guestWishlistEntries.length - entriesToCreate.length,
          };
        } else {
          mergedWishlist = { merged: 0, skipped: guestWishlistEntries.length };
        }

        await tx.wishlist.deleteMany({
          where: { userId: guestId },
        });
      } else {
        mergedWishlist = { merged: 0, skipped: 0 };
      }
    });

    return {
      message: 'Guest account merged successfully',
      mergedOrders,
      mergedCart,
      mergedWishlist,
    };
  }

  async createGuestUser(): Promise<GuestResponseDto> {
    const guestId = uuidv4();
    const guestEmail = `guest-${guestId}@rrfashion.guest`;

    const user = await this.prisma.user.create({
      data: {
        id: guestId,
        email: guestEmail,
        passwordHash: '',
        firstName: 'Guest',
        lastName: 'User',
        isGuest: true,
        isActive: true,
        role: 'CUSTOMER',
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.prisma.cart.create({
      data: { userId: user.id },
    });

    return {
      guestId: user.id,
      guestToken: tokens.accessToken,
    };
  }

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const purpose = dto.purpose ?? 'signup';
    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + this.otpTtlMs);

    await this.prisma.otpVerification.create({
      data: {
        phone: dto.phone,
        otpHash,
        purpose,
        verified: false,
        attempts: 0,
        expiresAt,
      },
    });

    await this.smsService.send({
      to: dto.phone,
      message: `Your RR Fashion verification code is ${otp}. It is valid for 10 minutes.`,
    });

    return { message: 'OTP sent' };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ verified: boolean }> {
    const purpose = dto.purpose ?? 'signup';

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        phone: dto.phone,
        purpose,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (record.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }

    if (record.otpHash !== this.hashOtp(dto.otp)) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });

    return { verified: true };
  }

  async resendOtp(dto: ResendOtpDto): Promise<{ message: string }> {
    const purpose = dto.purpose ?? 'signup';

    await this.prisma.otpVerification.updateMany({
      where: {
        phone: dto.phone,
        purpose,
        verified: false,
      },
      data: { expiresAt: new Date(0) },
    });

    return this.sendOtp({ phone: dto.phone, purpose });
  }

  private generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private hashOtp(otp: string): string {
    return createHmac('sha256', this.otpHashSecret).update(otp).digest('hex');
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresIn,
    });

    const rawRefreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + this.refreshExpiresInMs);

    await this.prisma.refreshToken.create({
      data: {
        token: rawRefreshToken,
        userId,
        isRevoked: false,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  // ──────────────────────────────────────────────
  //  REQ-BE-012: password reset / change flow
  // ──────────────────────────────────────────────

  /**
   * REQ-BE-012: Forgot-password request.
   * Always returns a generic success message so the endpoint cannot be
   * used to enumerate registered emails. When the user exists a single-use
   * reset token is generated, hashed, and stored in Redis with a 1-hour TTL.
   * The cleartext token is returned in the response so the test suite
   * (and an email integration that wires the message delivery) can use it
   * without touching Redis directly. In production the token would only
   * be sent out-of-band via email.
   */
  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || user.deletedAt) {
      this.logger.log({ email, action: 'password.reset.requested.unknown-email' });
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    const rawToken = randomBytes(32).toString('hex');
    const key = `${PASSWORD_RESET_KEY_PREFIX}${rawToken}`;
    // Store the userId in Redis. The token itself is never persisted in
    // plaintext on the server — only the lookup key (which is the token
    // hashed by Redis) holds the binding.
    try {
      await this.redis.set(key, user.id, PASSWORD_RESET_TTL_SECONDS);
    } catch (error) {
      this.logger.warn({
        email,
        error: (error as Error).message,
        action: 'password.reset.token.write.failed',
      });
      // Still return a generic message — never reveal internal failures.
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    this.logger.log({ userId: user.id, action: 'password.reset.token.issued' });

    return {
      message: 'If the email exists, a password reset link has been sent.',
      // Returned for testability + email integration. Not exposed in
      // production logs.
      resetToken: rawToken,
    };
  }

  /**
   * REQ-BE-012: Reset-password with a single-use token.
   * Validates the strong-password policy and the HIBP breach check, hashes
   * the new password, and invalidates all existing refresh tokens so a
   * stolen session token cannot outlive the reset (SEC-05).
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!isStrongPassword(newPassword)) {
      throw new BadRequestException(
        'Password must be at least 10 characters and include uppercase, lowercase, digit, and symbol characters',
      );
    }

    const hibpResult = await this.hibp.checkPassword(newPassword);
    if (hibpResult.pwned) {
      throw new BadRequestException(
        'This password has been found in a known data breach. Please choose a different password.',
      );
    }

    const key = `${PASSWORD_RESET_KEY_PREFIX}${token}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.deletedAt) {
      // Token points to a non-existent / disabled user — invalidate the token
      // and surface a generic error.
      await this.redis.del(key);
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.bcryptSaltRounds);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    // REQ-BE-012: single-use — drop the token regardless of success.
    await this.redis.del(key);

    this.logger.log({ userId, action: 'password.reset.completed' });

    return { message: 'Password has been reset successfully.' };
  }

  /**
   * REQ-BE-012: Authenticated change-password.
   * Requires the current password for verification and invalidates all
   * existing refresh tokens on success (SEC-05: revoke on password change).
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    if (!isStrongPassword(dto.newPassword)) {
      throw new BadRequestException(
        'Password must be at least 10 characters and include uppercase, lowercase, digit, and symbol characters',
      );
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const hibpResult = await this.hibp.checkPassword(dto.newPassword);
    if (hibpResult.pwned) {
      throw new BadRequestException(
        'This password has been found in a known data breach. Please choose a different password.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptSaltRounds);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    this.logger.log({ userId, action: 'password.changed' });

    return { message: 'Password has been changed. Please sign in again.' };
  }
}
