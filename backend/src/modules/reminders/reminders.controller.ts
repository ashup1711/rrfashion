import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RemindersService } from './reminders.service';

@ApiTags('Reminders')
@Controller('admin/jobs')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('trigger-cart-abandonment')
  @ApiOperation({ summary: 'Manually trigger cart abandonment check' })
  async triggerCartAbandonment() {
    return this.remindersService.triggerCartAbandonmentManually();
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('trigger-guest-cleanup')
  @ApiOperation({ summary: 'Manually trigger guest session cleanup' })
  async triggerGuestCleanup() {
    return this.remindersService.cleanupExpiredGuestSessions();
  }
}
