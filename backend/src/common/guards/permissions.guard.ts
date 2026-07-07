import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../config/constants';

export interface PermissionRequirement {
  module: string;
  action: string;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionRequirement[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Admin users have permissions array from AdminJwtStrategy
    const userPermissions: string[] = user.permissions || [];

    for (const required of requiredPermissions) {
      const requiredKey = `${required.module}:${required.action}`;
      if (!userPermissions.includes(requiredKey)) {
        throw new ForbiddenException(`Missing permission: ${required.module}:${required.action}`);
      }
    }

    return true;
  }
}
