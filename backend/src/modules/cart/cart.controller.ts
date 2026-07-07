import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GuestSessionId } from '../../common/decorators/guest-session-id.decorator';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CartService, CartIdentifier } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { CartResponseDto } from './dto/cart-response.dto';

interface RequestUser {
  type?: string;
  sub?: string;
  id?: string;
  guestSessionId?: string;
}

/**
 * Build a CartIdentifier from the request user context.
 * - Guest JWT: type='guest', sub=guestSessionId
 * - Customer JWT: type='customer', sub=userId
 * - Admin JWT: type='admin', sub=adminId
 * - No token (AllowGuest=true): user is null, fall back to guestSession query param
 */
function toCartIdentifier(user: RequestUser | null, guestSessionId?: string): CartIdentifier {
  if (user?.type === 'guest') {
    return { guestSessionId: user.sub || user.guestSessionId };
  }
  if (user?.sub || user?.id) {
    return { userId: user.sub || user.id };
  }
  if (guestSessionId) {
    return { guestSessionId };
  }
  return {};
}

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Get()
  @ApiCommonResponse({ summary: 'Get current cart', type: CartResponseDto })
  async findCart(
    @CurrentUser() user: RequestUser | null,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.cartService.findCart(toCartIdentifier(user, guestSessionId));
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Post('add')
  @ApiCommonResponse({ summary: 'Add item to cart', status: 201, type: CartResponseDto })
  async addItem(
    @CurrentUser() user: RequestUser | null,
    @Body() dto: AddCartItemDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.cartService.addItem(toCartIdentifier(user, guestSessionId), dto);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Patch('items/:itemId')
  @ApiCommonResponse({ summary: 'Update cart item quantity', type: CartResponseDto })
  async updateItem(
    @CurrentUser() user: RequestUser | null,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.cartService.updateItem(itemId, toCartIdentifier(user, guestSessionId), dto.quantity);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Delete('items/:itemId')
  @ApiCommonResponse({ summary: 'Remove item from cart' })
  async removeItem(
    @CurrentUser() user: RequestUser | null,
    @Param('itemId') itemId: string,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.cartService.removeItem(itemId, toCartIdentifier(user, guestSessionId));
  }

  @UseGuards(JwtAuthGuard)
  @Post('merge')
  @ApiCommonResponse({
    summary: 'Merge guest cart into authenticated user cart',
    type: CartResponseDto,
  })
  async mergeCart(@CurrentUser('id') userId: string, @Body() dto: MergeCartDto) {
    if (dto.guestSessionId) {
      return this.cartService.mergeGuestSessionIntoUserCart(dto.guestSessionId, userId);
    }
    if (dto.guestId) {
      return this.cartService.mergeCartByGuestId(dto.guestId, userId);
    }
    return { merged: 0, skipped: 0 };
  }
}
