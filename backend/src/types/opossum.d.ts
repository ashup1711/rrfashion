/**
 * Minimal type declarations for opossum (Circuit Breaker).
 * opossum does not ship its own TypeScript declarations,
 * so we provide a minimal typed interface for our use cases.
 */
declare module 'opossum' {
  import { EventEmitter } from 'events';

  interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    name?: string;
    group?: string;
    volumeThreshold?: number;
    enabled?: boolean;
    cache?: boolean;
    maxFailures?: number;
  }

  interface StatusEvent {
    stats: {
      successes: number;
      failures: number;
      rejects: number;
      timeouts: number;
      percentiles: Record<string, number>;
    };
  }

  class CircuitBreaker<TArgs extends unknown[] = unknown[], TReturn = unknown> extends EventEmitter {
    constructor(action: (...args: TArgs) => Promise<TReturn>, options?: CircuitBreakerOptions);

    readonly name: string;
    readonly group: string;
    readonly opened: boolean;
    readonly closed: boolean;
    readonly halfOpen: boolean;
    readonly pendingClose: boolean;
    readonly shutdown: boolean;
    readonly enabled: boolean;
    readonly warmUp: boolean;
    readonly volumeThreshold: number;
    readonly status: StatusEvent;

    fire(...args: TArgs): Promise<TReturn>;
    call(...args: TArgs): Promise<TReturn>;
    shutdown(): void;
    close(): void;
    open(): void;
    halfOpen(): void;
    disable(): void;
    enable(): void;

    on(event: 'open', listener: () => void): this;
    on(event: 'halfOpen', listener: () => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'shutdown', listener: () => void): this;
    on(event: 'fire', listener: (...args: TArgs) => void): this;
    on(event: 'reject', listener: (err: Error) => void): this;
    on(event: 'timeout', listener: (err: Error) => void): this;
    on(event: 'success', listener: (result: TReturn) => void): this;
    on(event: 'failure', listener: (err: Error) => void): this;
    on(event: 'fallback', listener: (result: unknown) => void): this;
    on(event: 'semaphoreLocked', listener: () => void): this;
    on(event: 'healthCheckFailed', listener: (err: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export = CircuitBreaker;
}
