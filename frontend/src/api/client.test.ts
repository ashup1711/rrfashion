import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './client';
import { GUEST_TOKEN_KEY } from '../utils/guestConstants';

interface TestConfig {
  url?: string;
  headers?: Record<string, string>;
}

function mockAdapter() {
  return vi.fn((_config: TestConfig) =>
    Promise.resolve({
      data: { success: true, data: {} },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    }),
  );
}

describe('apiClient request interceptor (REQ-SEC-FE-001)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('attaches guest Bearer token when present', async () => {
    localStorage.setItem(GUEST_TOKEN_KEY, 'g1');
    const adapter = mockAdapter();
    const res = await apiClient.request({ url: '/cart', adapter: adapter as any });
    const headers = adapter.mock.calls[0][0].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer g1');
    expect(res.status).toBe(200);
  });

  it('does not override an explicit Authorization header', async () => {
    localStorage.setItem(GUEST_TOKEN_KEY, 'g1');
    const adapter = mockAdapter();
    await apiClient.request({
      url: '/cart',
      headers: { Authorization: 'Bearer customer' },
      adapter: adapter as any,
    });
    const headers = adapter.mock.calls[0][0].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer customer');
  });

  it('does not attach Authorization when no guest token exists', async () => {
    const adapter = mockAdapter();
    await apiClient.request({ url: '/cart', adapter: adapter as any });
    const headers = adapter.mock.calls[0][0].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
