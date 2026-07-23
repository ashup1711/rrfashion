export function imageUrl(url: string | null | undefined, version?: number): string {
  if (!url) return '/images/placeholder.svg';
  const separator = url.includes('?') ? '&' : '?';
  const t = version ?? Date.now();
  return `${url}${separator}t=${t}`;
}
