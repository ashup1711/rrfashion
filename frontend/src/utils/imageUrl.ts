import { resolveImageUrl } from './constants';

/**
 * Get the API base URL for constructing image proxy paths.
 */
function getApiBase(): string {
  if (typeof window !== 'undefined' && window.__RUNTIME_ENV__?.API_URL) {
    return window.__RUNTIME_ENV__.API_URL;
  }
  return '/api';
}

export function imageUrl(src: string | null | undefined, defaultSize?: string): string {
  if (!src) return '/images/placeholder.svg';

  // If it's already an absolute URL or data URI, return as-is
  if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  // Use the image proxy endpoint for relative/storage paths
  const base = getApiBase();
  return `${base}/images/proxy/${encodeURIComponent(src)}`;
}

/**
 * Generate a low-resolution placeholder URL for blur-up effect.
 * Uses the image proxy with ?w=20 to fetch a tiny version.
 */
export function placeholderUrl(src: string): string {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (src.startsWith('http')) {
    // For already-absolute URLs, try to proxy them
  }
  const base = getApiBase();
  return `${base}/images/proxy/${encodeURIComponent(src)}?w=20&q=10`;
}

/**
 * Generate a full img srcSet string from an image key for responsive images.
 */
export function generateSrcSet(src: string, widths: number[] = [300, 800, 2000]): string {
  if (!src || src.startsWith('data:')) return '';
  const base = getApiBase();
  return widths
    .map((w) => `${base}/images/proxy/${encodeURIComponent(src)}?w=${w}&fmt=webp ${w}w`)
    .join(', ');
}
