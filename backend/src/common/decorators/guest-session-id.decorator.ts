import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * REQ-SEC-001 / REQ-BE-GUEST-001: Guest identity is resolved ONLY from the
 * verified guest JWT that StoreAuthGuard places on request.user.
 * The legacy `?guestSessionId=` query-param fallback is REMOVED.
 * Returns undefined when no verified guest token is present.
 */
export const GuestSessionId = createParamDecorator(
  (_data: string | undefined, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    if (request.user?.type === 'guest') {
      return (request.user.sub ?? request.user.guestSessionId) as string | undefined;
    }
    return undefined;
  },
);
