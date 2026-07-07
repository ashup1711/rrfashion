import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../config/constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Admin routes have user with role.name (AdminUser has role relation)
    // Customer routes have user with role (string from User model)
    const userRole = user.role?.name || user.role;

    return requiredRoles.some((role) => {
      if (role === 'SUPER_ADMIN') {
        return userRole === 'Super Admin';
      }
      if (role === 'ADMIN') {
        return (
          userRole === 'Super Admin' ||
          userRole === 'Store Manager' ||
          userRole === 'Inventory Staff'
        );
      }
      return userRole === role;
    });
  }
}
