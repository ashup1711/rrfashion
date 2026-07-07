import { SetMetadata } from '@nestjs/common';
import { ALLOW_GUEST_KEY } from '../../config/constants';

export const AllowGuest = (allow: boolean = true) => SetMetadata(ALLOW_GUEST_KEY, allow);
