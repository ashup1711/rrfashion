import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WalletService } from './wallet.service';
import { AdminWalletQueryDto } from './dto/admin-wallet-query.dto';

@ApiTags('Admin Wallet')
@Controller('admin/wallet')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER')
export class AdminWalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Get all wallet transactions across users' })
  @ApiCommonResponse({ summary: 'Get all wallet transactions across users' })
  async getTransactions(@Query() query: AdminWalletQueryDto) {
    return this.walletService.getAllTransactions(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated wallet stats' })
  @ApiCommonResponse({ summary: 'Get aggregated wallet stats' })
  async getStats() {
    return this.walletService.getStats();
  }
}
