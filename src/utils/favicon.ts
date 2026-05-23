/**
 * Favicon URL helpers.
 *
 * Chain used in BookmarkCard / MiniIcon:
 *   1. chrome://favicon2/  - Chrome internal cache (fast, works offline)
 *      Detected as empty when naturalWidth <= 1 (Chrome returns 1x1 transparent)
 *   2. DuckDuckGo           - broad coverage, works for niche/regional sites
 *   3. Google S2            - widely used fallback
 *   4. pin.svg              - final fallback
 */

/** Primary: Chrome internal favicon cache. Requires "favicon" permission. */
export function getFaviconUrl(pageUrl: string, size: 16 | 32 | 64 = 32): string {
  const encoded = encodeURIComponent(pageUrl);
  return `chrome://favicon2/?size=${size}&scale_factor=2x&show_fallback_monogram=false&page_url=${encoded}`;
}

/** Second: DuckDuckGo favicon service. Good coverage for niche and regional sites. */
export function getFaviconDDGUrl(pageUrl: string): string {
  try {
    const hostname = new URL(pageUrl).hostname;
    return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
  } catch {
    return "";
  }
}

/** Third: Google S2 favicon service. */
export function getFaviconFallbackUrl(pageUrl: string, size: 16 | 32 | 64 = 32): string {
  try {
    const origin = new URL(pageUrl).origin;
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=${size}`;
  } catch {
    return "";
  }
}
