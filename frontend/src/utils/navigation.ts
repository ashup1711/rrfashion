import type { NavigateFunction } from 'react-router-dom';

/**
 * REQ-FE-RC-003: Global SPA navigator.
 *
 * App() registers `useNavigate()` once via `setGlobalNavigator` so that
 * non-component code (axios interceptors, stores) can navigate without a full
 * page reload — no browser flashes, no lost React Query state.
 *
 * Before hydration (or if App has not mounted yet) we fall back to a hash-route
 * hard redirect so 401 handling still works in the pre-render edge.
 */
let navigateFn: NavigateFunction | null = null;

export function setGlobalNavigator(fn: NavigateFunction): void {
  navigateFn = fn;
}

/** SPA navigation with hard-redirect fallback (pre-hydration / crash recovery). */
export function navigate(path: string): void {
  if (navigateFn) {
    navigateFn(path);
    return;
  }
  window.location.href = `/rrfashion/#${path.startsWith('/') ? path : `/${path}`}`;
}
