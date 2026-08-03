/**
 * REQ-BE-011: HIBP service tests.
 *
 * HIBP_ENABLED is read at service construction. We exercise the disabled
 * path (the default) and the "service is alive but unreachable" path —
 * never the live API in unit tests.
 */
import { ConfigService } from '@nestjs/config';
import { HibpService } from './hibp.service';

const createConfig = (overrides: Record<string, string | undefined> = {}): ConfigService => {
  const store: Record<string, string | undefined> = { HIBP_ENABLED: 'false', ...overrides };
  return {
    get: jest.fn((key: string) => store[key]),
  } as unknown as ConfigService;
};

describe('HibpService', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('reports disabled when HIBP_ENABLED!=true', () => {
    const service = new HibpService(createConfig({ HIBP_ENABLED: 'false' }));
    expect(service.isEnabled()).toBe(false);
  });

  it('reports enabled when HIBP_ENABLED=true', () => {
    const service = new HibpService(createConfig({ HIBP_ENABLED: 'true' }));
    expect(service.isEnabled()).toBe(true);
  });

  it('returns not-pwned when disabled (no fetch)', async () => {
    const service = new HibpService(createConfig({ HIBP_ENABLED: 'false' }));
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await service.checkPassword('whatever');
    expect(result).toEqual({ pwned: false, occurrences: 0, source: 'disabled' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns not-pwned when the password is missing from the HIBP range', async () => {
    const service = new HibpService(createConfig({ HIBP_ENABLED: 'true' }));
    // SHA-1 prefix for "Str0ng!Pass" starts with "44E47"; pad the rest of
    // the response so our password hash is not present.
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => '0000000000000000000000000000000000000:1\r\n',
    })) as unknown as typeof fetch;

    const result = await service.checkPassword('Str0ng!Pass');
    expect(result.pwned).toBe(false);
    expect(result.source).toBe('api');
  });

  it('returns pwned when the HIBP range contains the suffix', async () => {
    const service = new HibpService(createConfig({ HIBP_ENABLED: 'true' }));
    // Compute the actual suffix for the test password so the parser logic
    // is genuinely exercised.
    const { createHash } = await import('crypto');
    const sha1 = createHash('sha1').update('Pwned!Pass2024').digest('hex').toUpperCase();
    const suffix = sha1.slice(5);
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => `${suffix}:42\r\nOTHER:1\r\n`,
    })) as unknown as typeof fetch;

    const result = await service.checkPassword('Pwned!Pass2024');
    expect(result.pwned).toBe(true);
    expect(result.occurrences).toBe(42);
    expect(result.source).toBe('api');
  });

  it('fails open on a non-2xx HTTP response', async () => {
    const service = new HibpService(createConfig({ HIBP_ENABLED: 'true' }));
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => '',
    })) as unknown as typeof fetch;

    const result = await service.checkPassword('Str0ng!Pass');
    expect(result.pwned).toBe(false);
    expect(result.source).toBe('error');
  });

  it('fails open when the fetch itself throws', async () => {
    const service = new HibpService(createConfig({ HIBP_ENABLED: 'true' }));
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNRESET');
    }) as unknown as typeof fetch;

    const result = await service.checkPassword('Str0ng!Pass');
    expect(result.pwned).toBe(false);
    expect(result.source).toBe('error');
  });
});
