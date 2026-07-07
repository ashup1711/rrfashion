import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiCommonResponse({ summary: 'Get my notifications' })
  async getMyNotifications(@CurrentUser('id') userId: string, @Query('type') type?: string) {
    return this.notificationsService.findByUser(userId, type);
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Post('test')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiCommonResponse({ summary: 'Send a test notification (admin only)', status: 201 })
  async sendTest(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }
}
