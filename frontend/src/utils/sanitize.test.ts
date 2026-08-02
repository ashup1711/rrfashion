import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml (REQ-SEC-FE-004)', () => {
  it('strips script tags', () => {
    expect(sanitizeHtml('<p>hi</p><script>alert(1)</script>')).not.toContain('<script');
  });

  it('keeps safe HTML', () => {
    expect(sanitizeHtml('<p><strong>ok</strong></p>')).toContain('<strong>ok</strong>');
  });

  it('strips inline event handlers', () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).not.toContain('onerror');
  });

  it('removes javascript: URLs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).not.toContain('javascript:');
  });
});
