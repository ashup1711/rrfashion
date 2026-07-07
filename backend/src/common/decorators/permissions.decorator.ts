import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../../config/constants';

export interface PermissionDefinition {
  module: string;
  action: string;
}

export const Permissions = (...permissions: PermissionDefinition[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
