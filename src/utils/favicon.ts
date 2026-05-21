/**
 * Returns a favicon URL for a given page URL.
 * Uses Google's favicon service as a fallback — requires no host permissions.
 */
export function getFaviconUrl(pageUrl: string, size: 16 | 32 | 64 = 32): string {
  try {
    const origin = new URL(pageUrl).origin;
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=${size}`;
  } catch {
    return "";
  }
}
