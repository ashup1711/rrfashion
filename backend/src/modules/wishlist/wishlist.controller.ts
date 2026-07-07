import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator';
import { StoreAuthGuard } from '../../common/guards/store-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GuestSessionId } from '../../common/decorators/guest-session-id.decorator';
import { WishlistService } from './wishlist.service';
import { AddWishlistDto } from './dto/add-wishlist.dto';
import { MergeWishlistDto } from './dto/merge-wishlist.dto';

interface RequestUser {
  type?: string;
  sub?: string;
  id?: string;
  guestSessionId?: string;
}

function toWishlistIdentifier(
  user: RequestUser | null,
  guestSessionId?: string,
): { userId?: string; guestSessionId?: string } {
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

@ApiTags('Wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Get()
  @ApiCommonResponse({ summary: 'Get user wishlist', isArray: true })
  async findAll(
    @CurrentUser() user: RequestUser | null,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.wishlistService.findAll(toWishlistIdentifier(user, guestSessionId));
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Post()
  @ApiCommonResponse({ summary: 'Add item to wishlist', status: 201 })
  async add(
    @CurrentUser() user: RequestUser | null,
    @Body() dto: AddWishlistDto,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.wishlistService.add(toWishlistIdentifier(user, guestSessionId), dto);
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Delete(':variantId')
  @ApiCommonResponse({ summary: 'Remove item from wishlist' })
  async remove(
    @CurrentUser() user: RequestUser | null,
    @Param('variantId') variantId: string,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.wishlistService.remove(toWishlistIdentifier(user, guestSessionId), variantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('merge')
  @ApiCommonResponse({ summary: 'Merge guest wishlist items on login' })
  async merge(@CurrentUser('id') userId: string, @Body() dto: MergeWishlistDto) {
    if (dto.guestSessionId) {
      return this.wishlistService.merge({
        userId,
        guestSessionId: dto.guestSessionId,
      });
    }
    if (dto.guestId) {
      return this.wishlistService.mergeByGuestUser(dto.guestId, userId);
    }
    return { merged: 0, skipped: 0 };
  }

  @UseGuards(StoreAuthGuard)
  @AllowGuest(true)
  @Post('add-all-to-cart')
  @ApiCommonResponse({ summary: 'Add all wishlist items to cart' })
  async addAllToCart(
    @CurrentUser() user: RequestUser | null,
    @GuestSessionId() guestSessionId?: string,
  ) {
    return this.wishlistService.addAllToCart(toWishlistIdentifier(user, guestSessionId));
  }
}
