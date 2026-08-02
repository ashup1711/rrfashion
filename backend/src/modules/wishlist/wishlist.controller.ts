import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiUnauthorizedResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';
import { AddWishlistDto } from './dto/add-wishlist.dto';

interface RequestUser {
  type?: string;
  sub?: string;
  id?: string;
  guestSessionId?: string;
}

/**
 * REQ-SEC-001: guest identity resolves ONLY from the verified guest JWT.
 * No query-param fallback — anonymous browse returns an empty wishlist.
 */
function toWishlistIdentifier(user: RequestUser | null): {
  userId?: string;
  guestSessionId?: string;
} {
  if (user?.type === 'guest') return { guestSessionId: user.sub || user.guestSessionId };
  if (user?.sub || user?.id) return { userId: user.sub || user.id };
  return {};
}

@ApiTags('Wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(
    private readonly wishlistService: WishlistService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Anonymous browse returns an empty wishlist — no token required.
  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Get()
  @ApiCommonResponse({ summary: 'Get user wishlist', isArray: true })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async findAll(@CurrentUser() user: RequestUser | null) {
    return this.wishlistService.findAll(toWishlistIdentifier(user));
  }

  // REQ-BE-GUEST-001: mutations REQUIRE a verified JWT.
  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post()
  @ApiCommonResponse({ summary: 'Add item to wishlist', status: 201 })
  @ApiUnauthorizedResponse({ description: 'Authentication required — send a valid JWT' })
  async add(@CurrentUser() user: RequestUser, @Body() dto: AddWishlistDto) {
    return this.wishlistService.add(toWishlistIdentifier(user), dto);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Delete(':variantId')
  @ApiCommonResponse({ summary: 'Remove item from wishlist' })
  @ApiUnauthorizedResponse({ description: 'Authentication required — send a valid JWT' })
  @ApiNotFoundResponse({ description: 'Item not in wishlist' })
  async remove(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.wishlistService.remove(toWishlistIdentifier(user), variantId);
  }

  // REQ-BE-GUEST-001: same token-in-header merge pattern as the cart.
  @UseGuards(JwtAuthGuard)
  @Post('merge')
  @ApiCommonResponse({ summary: 'Merge guest wishlist items on login' })
  @ApiUnauthorizedResponse({ description: 'Customer cookie or guest Bearer token missing/invalid' })
  async merge(@CurrentUser('id') userId: string, @Req() req: Request) {
    const guestSessionId = await this.resolveGuestSessionFromBearer(req);
    if (!guestSessionId) return { merged: 0, skipped: 0 };
    return this.wishlistService.merge({ userId, guestSessionId });
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post('add-all-to-cart')
  @ApiCommonResponse({ summary: 'Add all wishlist items to cart' })
  @ApiUnauthorizedResponse({ description: 'Authentication required — send a valid JWT' })
  async addAllToCart(@CurrentUser() user: RequestUser) {
    return this.wishlistService.addAllToCart(toWishlistIdentifier(user));
  }

  /**
   * REQ-BE-GUEST-001 (pitfall #4): resolve the guest session from the raw
   * Authorization header — JwtAuthGuard populates request.user from the cookie.
   */
  private async resolveGuestSessionFromBearer(req: Request): Promise<string | null> {
    const authHeader = req.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const secret = this.configService.get<string>('auth.jwtSecret', 'rr-fashion-jwt-secret-dev');

    try {
      const payload = this.jwtService.verify(token, { secret }) as {
        type?: string;
        sub?: string;
      };
      if (payload.type === 'guest' && payload.sub) return payload.sub;
      return null;
    } catch {
      return null; // invalid guest token → nothing to merge (customer still authenticated via cookie)
    }
  }
}
