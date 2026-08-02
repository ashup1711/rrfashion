import { describe, it, expect, vi } from 'vitest';
import { Component, Suspense, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { retryLazy } from './retryLazy';

class TestErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <div>boundary-caught</div>;
    return this.props.children;
  }
}

describe('retryLazy (REQ-FE-BP-001)', () => {
  it('recovers after a transient chunk load failure (retries the import)', async () => {
    const MockComponent = () => <div>loaded</div>;
    let calls = 0;
    const loader = vi.fn(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.reject(new Error('Loading chunk 123 failed'));
      }
      return Promise.resolve({ default: MockComponent });
    });

    const Lazy = retryLazy(loader, 2);

    render(
      <Suspense fallback={<div>loading</div>}>
        <Lazy />
      </Suspense>,
    );

    await waitFor(() => expect(screen.getByText('loaded')).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('falls through to the real error after exhausting retries', async () => {
    const loader = vi.fn(() => Promise.reject(new Error('Loading chunk 999 failed')));

    const Lazy = retryLazy(loader, 1);

    render(
      <TestErrorBoundary>
        <Suspense fallback={<div>loading</div>}>
          <Lazy />
        </Suspense>
      </TestErrorBoundary>,
    );

    // The wrapper only schedules retries when the promise is observed by React;
    // a persistent failure must surface as a thrown error (caught here by the
    // test error boundary so it doesn't leak as an unhandled rejection). We
    // assert the loader was invoked the expected number of times (initial + 1
    // retry) and the boundary rendered its fallback.
    await waitFor(() => expect(screen.getByText('boundary-caught')).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
