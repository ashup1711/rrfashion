import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    // For StoreAuthGuard: the payload uses `sub` claim (JWT standard)
    // For Passport strategies (JwtAuthGuard): the validated user has `id`
    if (data === 'id') {
      return user.sub || user.id || null;
    }

    return data ? user[data] : { ...user, sub: user.sub || user.id };
  },
);
