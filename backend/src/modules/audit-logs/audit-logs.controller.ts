import { Controller, Get, Query, UseGuards, Header } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLogsService } from './audit-logs.service';

class AuditLogsQueryDto {
  @ApiProperty({ description: 'Filter by acting admin id', required: false })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiProperty({ description: 'Filter by action code', required: false })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ description: 'Filter by affected entity type', required: false })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiProperty({ description: 'Filter by affected entity id', required: false })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ description: 'ISO start date (inclusive)', required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ description: 'ISO end date (inclusive)', required: false })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ description: 'Page number (1-based)', required: false, default: 1 })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @IsString()
  limit?: string;
}

@ApiTags('Admin / Audit Logs')
@Controller('admin/audit-logs')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'List admin audit-log entries with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated audit log entries' })
  @ApiResponse({ status: 401, description: 'Invalid or expired admin token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async list(@Query() query: AuditLogsQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 100) : 20;

    return this.auditLogsService.query(
      {
        actorId: query.actorId,
        action: query.action,
        entity: query.entity,
        entityId: query.entityId,
        from: query.from,
        to: query.to,
      },
      page,
      limit,
    );
  }
}
