import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Tenant, TenantMembership, TenantRole, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { AddTenantMemberDto } from './dto/add-tenant-member.dto';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  businessType: Tenant['businessType'];
  status: TenantStatus;
  plan: Tenant['plan'];
  role: TenantRole;
}

export type MembershipWithTenant = TenantMembership & { tenant: Tenant };

const TRIAL_DAYS = 14;
const INACCESSIBLE: TenantStatus[] = [TenantStatus.SUSPENDED, TenantStatus.DELETED];
const MANAGER_ROLES: TenantRole[] = [TenantRole.OWNER, TenantRole.ADMIN];

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /** Throws unless the tenant exists and may be accessed (not suspended or deleted). */
  assertAccessible(tenant: Tenant | null, method = 'GET'): Tenant {
    if (!tenant || tenant.status === TenantStatus.DELETED || tenant.deletedAt) {
      throw new NotFoundException('Tenant not found');
    }
    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException('Tenant is suspended');
    }
    if (tenant.status === TenantStatus.PAST_DUE && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      throw new ForbiddenException('Tenant is past due: read-only mode');
    }
    return tenant;
  }

  async getAccessibleTenant(tenantId: string, method?: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return this.assertAccessible(tenant, method);
  }

  async listMemberships(adminUserId: string): Promise<MembershipWithTenant[]> {
    return this.prisma.tenantMembership.findMany({
      where: {
        adminUserId,
        revokedAt: null,
        tenant: { status: { notIn: INACCESSIBLE }, deletedAt: null },
      },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Returns the active membership of an admin in a tenant, or throws 403/404. */
  async resolveMembership(
    adminUserId: string,
    tenantId: string,
    method?: string,
  ): Promise<MembershipWithTenant> {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_adminUserId: { tenantId, adminUserId } },
      include: { tenant: true },
    });
    if (!membership || membership.revokedAt) {
      throw new ForbiddenException('Not a member of this tenant');
    }
    this.assertAccessible(membership.tenant, method);
    return membership;
  }

  /** Picks the requested tenant if the admin may use it, otherwise their first membership. */
  async resolveActiveMembership(
    adminUserId: string,
    requestedTenantId?: string,
    method?: string,
  ): Promise<MembershipWithTenant> {
    if (requestedTenantId) {
      return this.resolveMembership(adminUserId, requestedTenantId, method);
    }
    const [first] = await this.listMemberships(adminUserId);
    if (!first) {
      throw new ForbiddenException('No active tenant membership');
    }
    this.assertAccessible(first.tenant, method);
    return first;
  }

  /**
   * Used at login/refresh: honours the preferred tenant when the admin may still use it,
   * otherwise falls back to their first accessible membership instead of failing.
   */
  async resolvePreferredMembership(
    adminUserId: string,
    preferredTenantId?: string,
  ): Promise<MembershipWithTenant> {
    const memberships = await this.listMemberships(adminUserId);
    const membership = memberships.find((m) => m.tenantId === preferredTenantId) ?? memberships[0];
    if (!membership) {
      throw new ForbiddenException('No active tenant membership');
    }
    return membership;
  }

  toSummary(membership: MembershipWithTenant): TenantSummary {
    const { tenant } = membership;
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      businessType: tenant.businessType,
      status: tenant.status,
      plan: tenant.plan,
      role: membership.role,
    };
  }

  async listSummaries(adminUserId: string): Promise<TenantSummary[]> {
    const memberships = await this.listMemberships(adminUserId);
    return memberships.map((m) => this.toSummary(m));
  }

  async create(adminUserId: string, dto: CreateTenantDto): Promise<TenantSummary> {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException('A tenant with this slug already exists');
    }
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        legalName: dto.legalName,
        slug: dto.slug,
        businessType: dto.businessType,
        gstin: dto.gstin,
        pan: dto.pan,
        status: TenantStatus.TRIAL,
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        ownerAdminId: adminUserId,
        memberships: {
          create: { adminUserId, role: TenantRole.OWNER, acceptedAt: new Date() },
        },
      },
      include: { memberships: { where: { adminUserId } } },
    });
    return this.toSummary({ ...tenant.memberships[0], tenant });
  }

  async listMembers(tenantId: string) {
    return this.prisma.tenantMembership.findMany({
      where: { tenantId, revokedAt: null },
      select: {
        id: true,
        role: true,
        acceptedAt: true,
        createdAt: true,
        adminUser: { select: { id: true, name: true, email: true, isActive: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(tenantId: string, actorId: string, dto: AddTenantMemberDto) {
    await this.assertManager(tenantId, actorId);
    const admin = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (!admin || admin.deletedAt) {
      throw new NotFoundException('Admin user not found');
    }
    if (dto.role === TenantRole.OWNER) {
      await this.assertOwner(tenantId, actorId);
    }
    return this.prisma.tenantMembership.upsert({
      where: { tenantId_adminUserId: { tenantId, adminUserId: admin.id } },
      create: {
        tenantId,
        adminUserId: admin.id,
        role: dto.role ?? TenantRole.STAFF,
        invitedBy: actorId,
        acceptedAt: new Date(),
      },
      update: { role: dto.role ?? TenantRole.STAFF, revokedAt: null, invitedBy: actorId },
    });
  }

  async revokeMember(tenantId: string, actorId: string, membershipId: string): Promise<void> {
    await this.assertManager(tenantId, actorId);
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { id: membershipId, tenantId, revokedAt: null },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    if (membership.role === TenantRole.OWNER) {
      const owners = await this.prisma.tenantMembership.count({
        where: { tenantId, role: TenantRole.OWNER, revokedAt: null },
      });
      if (owners <= 1) {
        throw new BadRequestException('Cannot revoke the last owner of a tenant');
      }
    }
    await this.prisma.tenantMembership.update({
      where: { id: membership.id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Owners may delete their tenant. Suspending/reactivating is a platform operation
   * restricted to emails listed in PLATFORM_ADMIN_EMAILS.
   */
  async updateStatus(
    tenantId: string,
    actor: { id: string; email: string },
    status: TenantStatus,
  ): Promise<Tenant> {
    if (status === TenantStatus.DELETED) {
      await this.assertOwner(tenantId, actor.id);
    } else if (!this.isPlatformAdmin(actor.email)) {
      throw new ForbiddenException('Only platform administrators can change tenant status');
    }
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status, deletedAt: status === TenantStatus.DELETED ? new Date() : null },
    });
  }

  isPlatformAdmin(email: string): boolean {
    const configured = this.configService.get<string>('PLATFORM_ADMIN_EMAILS', '');
    return configured
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .includes(email.toLowerCase());
  }

  private async assertManager(tenantId: string, adminUserId: string): Promise<void> {
    const membership = await this.resolveMembership(adminUserId, tenantId);
    if (!MANAGER_ROLES.includes(membership.role)) {
      throw new ForbiddenException('Only tenant owners and admins can manage members');
    }
  }

  private async assertOwner(tenantId: string, adminUserId: string): Promise<void> {
    const membership = await this.resolveMembership(adminUserId, tenantId);
    if (membership.role !== TenantRole.OWNER) {
      throw new ForbiddenException('Only tenant owners can perform this action');
    }
  }
}
