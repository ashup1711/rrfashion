import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GuestSessionId = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // First try JWT payload (StoreAuthGuard sets guestSessionId for guests)
    if (request.user?.guestSessionId) {
      return request.user.guestSessionId;
    }
    // Fall back to query param for backward compatibility
    return data ? request.query?.[data] : request.query?.guestSessionId;
  },
);
