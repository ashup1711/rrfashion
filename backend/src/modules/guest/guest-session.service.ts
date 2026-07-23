import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestSession } from '@prisma/client';
import { GuestAddressService } from './guest-address.service';
import {
  CreateGuestAddressDto,
  UpdateGuestAddressDto,
  GuestAddressResponseDto,
} from './dto/guest-address.dto';

export type GuestValidationResult =
  { ok: true; session: GuestSession } | { ok: false; reason: 'not_found' | 'expired' };

export interface CleanupResult {
  sessions: number;
  cartItems: number;
  wishlistItems: number;
  addresses: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class GuestSessionService {
  private readonly logger = new Logger(GuestSessionService.name);
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly guestAddressService: GuestAddressService,
  ) {
    const ttlDays = this.configService.get<number>('GUEST_SESSION_TTL_DAYS', 30);
    this.ttlMs = ttlDays * MS_PER_DAY;
  }

  async create(): Promise<{ guestSessionId: string; expiresAt: Date }> {
    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);

    await this.prisma.guestSession.create({
      data: {
        id,
        expiresAt,
        lastActivityAt: now,
      },
    });

    this.logger.log({ guestSessionId: id, action: 'guest.session.created' });

    return { guestSessionId: id, expiresAt };
  }

  /**
   * Create a guest session and sign a JWT token for it.
   * The token uses the customer JWT secret with type='guest' so that
   * StoreAuthGuard can authenticate it alongside regular customer tokens.
   */
  async createWithToken(): Promise<{
    guestToken: string;
    guestSessionId: string;
    expiresAt: Date;
  }> {
    const { guestSessionId, expiresAt } = await this.create();

    const payload = {
      sub: guestSessionId,
      type: 'guest',
      guestSessionId,
    };

    const ttlSeconds = Math.floor(this.ttlMs / 1000);
    const guestToken = this.jwtService.sign(payload, {
      expiresIn: ttlSeconds,
    });

    this.logger.log({ guestSessionId, action: 'guest.token.created' });

    return { guestToken, guestSessionId, expiresAt };
  }

  async validate(id: string): Promise<GuestValidationResult> {
    const session = await this.prisma.guestSession.findUnique({
      where: { id },
    });

    if (!session) {
      return { ok: false, reason: 'not_found' };
    }

    if (session.expiresAt < new Date()) {
      return { ok: false, reason: 'expired' };
    }

    return { ok: true, session };
  }

  async touch(id: string): Promise<void> {
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + this.ttlMs);

    await this.prisma.guestSession.update({
      where: { id },
      data: {
        lastActivityAt: now,
        expiresAt: newExpiresAt,
      },
    });
  }

  async getOrCreate(
    id?: string,
  ): Promise<{ guestSessionId: string; expiresAt: Date; created: boolean }> {
    if (id) {
      const validation = await this.validate(id);
      if (validation.ok) {
        await this.touch(id);
        return {
          guestSessionId: validation.session.id,
          expiresAt: validation.session.expiresAt,
          created: false,
        };
      }
    }
    const created = await this.create();
    return { ...created, created: true };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.guestSession.delete({ where: { id } });
    this.logger.log({ guestSessionId: id, action: 'guest.session.deleted' });
  }

  async createAddress(
    guestSessionId: string,
    dto: CreateGuestAddressDto,
  ): Promise<GuestAddressResponseDto> {
    return this.guestAddressService.create(guestSessionId, dto);
  }

  async getAddresses(guestSessionId: string): Promise<GuestAddressResponseDto[]> {
    return this.guestAddressService.findBySession(guestSessionId);
  }

  async updateAddress(
    guestSessionId: string,
    addressId: string,
    dto: UpdateGuestAddressDto,
  ): Promise<GuestAddressResponseDto> {
    return this.guestAddressService.update(guestSessionId, addressId, dto);
  }

  async deleteAddress(guestSessionId: string, addressId: string): Promise<{ success: boolean }> {
    return this.guestAddressService.delete(guestSessionId, addressId);
  }

  async setDefaultAddress(
    guestSessionId: string,
    addressId: string,
  ): Promise<GuestAddressResponseDto> {
    return this.guestAddressService.setDefault(guestSessionId, addressId);
  }

  async cleanupExpired(now: Date): Promise<CleanupResult> {
    const expired = await this.prisma.guestSession.findMany({
      where: { expiresAt: { lt: now } },
      include: {
        _count: {
          select: { cartItems: true, wishlistItems: true, addresses: true },
        },
      },
    });

    if (expired.length === 0) {
      return { sessions: 0, cartItems: 0, wishlistItems: 0, addresses: 0 };
    }

    let cartItems = 0;
    let wishlistItems = 0;
    let addresses = 0;
    for (const session of expired) {
      cartItems += session._count.cartItems;
      wishlistItems += session._count.wishlistItems;
      addresses += session._count.addresses;
    }

    const result = await this.prisma.guestSession.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    this.logger.log({
      sessions: result.count,
      cartItems,
      wishlistItems,
      addresses,
      action: 'guest.session.cleanup',
    });

    return {
      sessions: result.count,
      cartItems,
      wishlistItems,
      addresses,
    };
  }
}
