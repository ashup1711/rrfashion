import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { GuestSessionId } from './guest-session-id.decorator';

describe('GuestSessionId decorator (REQ-SEC-001)', () => {
  // Apply the decorator to a fake handler, then pull the captured factory out of
  // the ROUTE_ARGS_METADATA so we can invoke it with a mocked ExecutionContext.
  class FakeController {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handler(@GuestSessionId() _guestSessionId: string): void {}
  }

  interface GuestParamMetadata {
    factory: (data: string | undefined, ctx: ExecutionContext) => string | undefined;
  }

  const getFactory = (): GuestParamMetadata['factory'] => {
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, FakeController, 'handler') as Record<
      string,
      GuestParamMetadata
    >;
    return Object.values(metadata)[0].factory;
  };

  const run = (request: unknown): string | undefined => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return getFactory()(undefined, ctx);
  };

  it('resolves from a verified guest JWT payload', () => {
    expect(run({ user: { type: 'guest', sub: 'sess-1', guestSessionId: 'sess-1' } })).toBe(
      'sess-1',
    );
  });

  it('resolves from guestSessionId when sub is missing (legacy payloads)', () => {
    expect(run({ user: { type: 'guest', guestSessionId: 'sess-2' } })).toBe('sess-2');
  });

  it('returns undefined for authenticated customers', () => {
    expect(run({ user: { type: 'customer', sub: 'u-1' } })).toBeUndefined();
  });

  it('returns undefined for anonymous requests even with ?guestSessionId= query param (REMOVED fallback)', () => {
    expect(run({ user: null, query: { guestSessionId: 'sess-evil' } })).toBeUndefined();
  });

  it('returns undefined when no user is attached at all', () => {
    expect(run({ query: { guestSessionId: 'sess-evil' } })).toBeUndefined();
  });
});
