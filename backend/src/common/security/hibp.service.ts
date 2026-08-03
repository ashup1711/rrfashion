/**
 * REQ-BE-011: Optional HaveIBeenPwned k-anonymity check.
 *
 * Uses the public HIBP Pwned Passwords range API
 * (https://api.pwnedpasswords.com/range/{first-5-of-sha1}). Only the first
 * 5 hex chars of the SHA-1 hash are sent; the rest is compared client-side
 * against the response. The cleartext password never leaves the server.
 *
 * The check is **opt-in** via the `HIBP_ENABLED` env flag. When disabled
 * the service short-circuits and reports `notPwned: true` so callers can
 * always treat "ok" as "no known breach".
 *
 * SEC-12: no external URL is accepted from the caller — the API host is
 * hard-coded to api.pwnedpasswords.com.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

const HIBP_RANGE_PREFIX = 'https://api.pwnedpasswords.com/range/';
// Per HIBP docs the response uses CRLF line endings.
const HIBP_LINE_SEPARATOR = '\r\n';
// Network safety: short, hard timeout so a slow HIBP does not stall login.
const HIBP_FETCH_TIMEOUT_MS = 3000;

export interface HibpCheckResult {
  /** true when the password was found in any known breach corpus. */
  pwned: boolean;
  /** Number of times the password appears in the corpus (0 when pwned=false). */
  occurrences: number;
  /** Where the result came from — used for observability / debug. */
  source: 'api' | 'disabled' | 'error' | 'unsupported';
}

@Injectable()
export class HibpService {
  private readonly logger = new Logger(HibpService.name);
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    // Read once at boot — HIBP_ENABLED is a deployment-time flag, not a
    // per-request toggle. Operators must restart the service to change it.
    const raw = config.get<string>('HIBP_ENABLED', 'false');
    this.enabled = raw.toLowerCase() === 'true';
    if (this.enabled) {
      this.logger.log('HIBP_ENABLED=true — breached-password check is active');
    } else {
      this.logger.log('HIBP_ENABLED!=true — breached-password check is disabled');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Returns a structured result so callers can choose how to react.
   * Failures (network errors, timeouts) are treated as "not pwned" so
   * the auth flow is not blocked by an external service outage.
   */
  async checkPassword(password: string): Promise<HibpCheckResult> {
    if (!this.enabled) {
      return { pwned: false, occurrences: 0, source: 'disabled' };
    }

    if (typeof password !== 'string' || password.length === 0) {
      return { pwned: false, occurrences: 0, source: 'unsupported' };
    }

    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HIBP_FETCH_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(HIBP_RANGE_PREFIX + prefix, {
          method: 'GET',
          headers: { 'Add-Padding': 'true' },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        this.logger.warn(`HIBP range API returned ${response.status} — failing open`);
        return { pwned: false, occurrences: 0, source: 'error' };
      }

      const body = await response.text();
      const lines = body.split(HIBP_LINE_SEPARATOR);
      for (const line of lines) {
        const colon = line.indexOf(':');
        if (colon < 0) continue;
        const hashSuffix = line.slice(0, colon).toUpperCase();
        if (hashSuffix === suffix) {
          const count = Number.parseInt(line.slice(colon + 1), 10) || 0;
          return { pwned: true, occurrences: count, source: 'api' };
        }
      }
      return { pwned: false, occurrences: 0, source: 'api' };
    } catch (error) {
      // Network/timeout — never block the user on an external failure.
      this.logger.warn(`HIBP lookup failed (${(error as Error).message}) — failing open`);
      return { pwned: false, occurrences: 0, source: 'error' };
    }
  }
}
