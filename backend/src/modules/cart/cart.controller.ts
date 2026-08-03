import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiGoneResponse,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CartService, CartIdentifier } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';

/** REQ-BE-005: stable token type claim so recovery JWTs are never mistaken for auth JWTs. */
const CART_RECOVERY_TOKEN_TYPE = 'cart-recovery';
/** REQ-BE-005: recovery links expire after 7 days. */
const CART_RECOVERY_TOKEN_TTL = '7d';

interface RequestUser {
  type?: string;
  sub?: string;
  id?: string;
  guestSessionId?: string;
}

/**
 * Build a CartIdentifier from the request user context.
 * REQ-SEC-001: guest identity resolves ONLY from the verified guest JWT
 * (type='guest', sub=guestSessionId) — no query-param fallback.
 * - Guest JWT: type='guest', sub=guestSessionId
 * - Customer JWT: type='customer', sub=userId
 * - Admin JWT: type='admin', sub=adminId
 * - No token (AllowGuest=true): user is null → {} (anonymous browse returns empty cart)
 */
function toCartIdentifier(user: RequestUser | null): CartIdentifier {
  if (user?.type === 'guest') {
    return { guestSessionId: user.sub || user.guestSessionId };
  }
  if (user?.sub || user?.id) {
    return { userId: user.sub || user.id };
  }
  return {};
}

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Anonymous browse returns an empty cart — no token required.
  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Get()
  @ApiCommonResponse({ summary: 'Get current cart', type: CartResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async findCart(@CurrentUser() user: RequestUser | null) {
    return this.cartService.findCart(toCartIdentifier(user));
  }

  // REQ-BE-GUEST-001: mutations REQUIRE a verified JWT (customer, guest, or admin).
  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post('add')
  @ApiCommonResponse({ summary: 'Add item to cart', status: 201, type: CartResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required — send a valid JWT' })
  async addItem(@CurrentUser() user: RequestUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(toCartIdentifier(user), dto);
  }

  // REQ-BE-003: canonical add-item endpoint. Alias of POST /api/cart/add with
  // a relaxed guard (guests without a JWT reach the service and get a 400 for
  // missing identity instead of a 401 — identity is still never client-supplied).
  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Post('items')
  @ApiCommonResponse({
    summary: 'Add item to cart (REQ-BE-003)',
    status: 201,
    type: CartResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiBadRequestResponse({ description: 'Missing identity or invalid body' })
  async addItemV2(@CurrentUser() user: RequestUser | null, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(toCartIdentifier(user), dto);
  }

  // REQ-BE-005: mint a 7-day signed recovery JWT for the caller's own cart.
  // Used by the abandonment email flow to build the /api/cart/recover/:token link.
  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Post('recovery-token')
  @ApiCommonResponse({ summary: 'Generate cart recovery token' })
  @ApiUnauthorizedResponse({ description: 'Authentication required — send a valid JWT' })
  @ApiNotFoundResponse({ description: 'Cart not found — add items first' })
  async createRecoveryToken(@CurrentUser() user: RequestUser) {
    const cartId = await this.cartService.resolveOwnCartId(toCartIdentifier(user));
    return { token: this.signRecoveryToken(cartId), expiresIn: CART_RECOVERY_TOKEN_TTL };
  }

  // REQ-BE-005: public recovery link — optional JWT (guest or customer).
  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Get('recover/:token')
  @ApiCommonResponse({ summary: 'Recover an abandoned cart from a signed link', auth: false })
  @ApiBadRequestResponse({ description: 'Invalid or expired recovery token' })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  @ApiGoneResponse({ description: 'Recovery link has already been used' })
  async recoverCart(@Param('token') token: string, @CurrentUser() user: RequestUser | null) {
    const cartId = this.verifyRecoveryToken(token);
    return this.cartService.recoverCart(cartId, toCartIdentifier(user));
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Patch('items/:itemId')
  @ApiCommonResponse({ summary: 'Update cart item quantity', type: CartResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required — send a valid JWT' })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  async updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(itemId, toCartIdentifier(user), dto.quantity);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(false)
  @Delete('items/:itemId')
  @ApiCommonResponse({ summary: 'Remove item from cart' })
  @ApiUnauthorizedResponse({ description: 'Authentication required — send a valid JWT' })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  async removeItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.cartService.removeItem(itemId, toCartIdentifier(user));
  }

  // REQ-BE-GUEST-001: merge carries the guest JWT in the Authorization header
  // (verified here), while the customer identity comes from the access_token
  // cookie via JwtAuthGuard. Request body is `{}` — no guestSessionId/guestId.
  @UseGuards(JwtAuthGuard)
  @Post('merge')
  @ApiCommonResponse({ summary: 'Merge guest cart into authenticated user cart' })
  @ApiUnauthorizedResponse({ description: 'Customer cookie or guest Bearer token missing/invalid' })
  async mergeCart(@CurrentUser('id') userId: string, @Req() req: Request) {
    const guestSessionId = await this.resolveGuestSessionFromBearer(req);
    if (!guestSessionId) return { merged: 0, skipped: 0 };
    return this.cartService.mergeGuestSessionIntoUserCart(guestSessionId, userId);
  }

  /**
   * REQ-BE-005: sign a recovery JWT `{ cartId, type: 'cart-recovery' }` with
   * the customer JWT secret (JWT_SECRET) and a 7-day expiry.
   */
  private signRecoveryToken(cartId: string): string {
    const secret = this.configService.get<string>('auth.jwtSecret', 'rr-fashion-jwt-secret-dev');
    return this.jwtService.sign(
      { cartId, type: CART_RECOVERY_TOKEN_TYPE },
      { secret, expiresIn: CART_RECOVERY_TOKEN_TTL },
    );
  }

  /**
   * REQ-BE-005: verify a recovery JWT. Only `type === 'cart-recovery'` tokens
   * are accepted — an auth JWT can never double as a recovery link.
   */
  private verifyRecoveryToken(token: string): string {
    const secret = this.configService.get<string>('auth.jwtSecret', 'rr-fashion-jwt-secret-dev');
    let payload: { cartId?: string; type?: string };
    try {
      payload = this.jwtService.verify(token, { secret }) as { cartId?: string; type?: string };
    } catch {
      throw new BadRequestException('Invalid or expired recovery token');
    }

    if (payload.type !== CART_RECOVERY_TOKEN_TYPE || !payload.cartId) {
      throw new BadRequestException('Invalid or expired recovery token');
    }

    return payload.cartId;
  }

  /**
   * REQ-BE-GUEST-001 (pitfall #4): JwtAuthGuard reads the access_token cookie
   * first, so the guest session must be resolved from the RAW Authorization
   * header — never from `request.user` (that holds the customer).
   * Returns null when the header is absent or not a valid guest token; the
   * customer remains authenticated via the cookie, so nothing is merged.
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
