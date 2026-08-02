import DOMPurify from 'dompurify';

/**
 * REQ-SEC-FE-004 / SEC-08: single choke point for sanitizing any
 * server/user-provided HTML before it is inserted via dangerouslySetInnerHTML.
 * Relies on DOMPurify (client-side) — `isomorphic-dompurify` is backend-only.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
