import { resolveImageUrl } from './constants';

export function imageUrl(url: string | null | undefined, version?: number): string {
  if (!url) return '/images/placeholder.svg';
  // Resolve relative backend URLs to absolute (e.g. /uploads/... → https://backend/uploads/...)
  const absoluteUrl = resolveImageUrl(url);
  const separator = absoluteUrl.includes('?') ? '&' : '?';
  const t = version ?? Date.now();
  return `${absoluteUrl}${separator}t=${t}`;
}
