/**
 * Favicon URL helpers.
 *
 * Chain used in BookmarkCard / MiniIcon:
 *   1. chrome://favicon2/  - Chrome internal cache (fast, works offline)
 *   2. DuckDuckGo           - broad coverage, works for niche/regional sites
 *   3. Google S2            - widely used fallback
 *   4. pin.svg              - final fallback
 */

/**
 * Primary: Chrome internal favicon cache via fetch() -> blob URL.
 * Requires "favicon" permission. Must NOT be used as <img src> directly --
 * Chrome blocks chrome:// URLs in image loading; only fetch() is allowed.
 * Returns "" if not cached or on error.
 */
export async function fetchChromeFavicon(
  pageUrl: string,
  size: 16 | 32 | 64 = 32,
): Promise<string> {
  const encoded = encodeURIComponent(pageUrl);
  const chromeFaviconBase = "chrome://favicon2/";
  const url =
    chromeFaviconBase +
    "?size=" +
    size +
    "&scale_factor=2x&show_fallback_monogram=false&page_url=" +
    encoded;
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const blob = await response.blob();
    // Chrome returns a 1x1 transparent PNG (~68 bytes) when the icon is not cached
    if (blob.size <= 100) return "";
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

/** Second: DuckDuckGo favicon service. Good coverage for niche and regional sites. */
export function getFaviconDDGUrl(pageUrl: string): string {
  try {
    const hostname = new URL(pageUrl).hostname;
    return "https://icons.duckduckgo.com/ip3/" + hostname + ".ico";
  } catch {
    return "";
  }
}

/** Third: Google S2 favicon service. */
export function getFaviconFallbackUrl(pageUrl: string, size: 16 | 32 | 64 = 32): string {
  try {
    const origin = new URL(pageUrl).origin;
    return "https://www.google.com/s2/favicons?domain=" + origin + "&sz=" + size;
  } catch {
    return "";
  }
}
