/**
 * Favicon URL helpers.
 *
 * Chain used in BookmarkCard / MiniIcon / useFaviconCache:
 *   1. Direct favicon files  - fetched straight from the site's own origin (most accurate)
 *   2. Google S2             - third-party favicon service; used as a fallback only, because it
 *                              returns a generic default icon (not an error) for sites it doesn't
 *                              recognize, so it "succeeds" even when it has nothing real to show
 *   3. chrome://favicon2/    - Chrome internal cache (cache-only; not usable as a live <img src>)
 *   4. pin.svg               - final fallback
 */

/**
 * Primary: Chrome internal favicon cache via fetch() -> data URL.
 * Requires "favicon" permission. Must NOT be used as <img src> directly --
 * Chrome blocks chrome:// URLs in image loading; only fetch() is allowed.
 *
 * Returns a base64 data URL so the result is safe to persist in
 * chrome.storage.local across page reloads (blob: URLs die with the document).
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
    return await blobToDataUrl(blob);
  } catch {
    return "";
  }
}

/** Convert a Blob to a base64 data URL via FileReader. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}

/**
 * Second: Google S2 favicon service.
 * Kept as a fallback (not primary) because it returns a generic default icon --
 * not an error -- for sites it doesn't have a real favicon for, so treating it
 * as authoritative means we'd rarely ever fall through to the site's own icon.
 */
export function getFaviconFallbackUrl(pageUrl: string, size: 16 | 32 | 64 = 32): string {
  try {
    const origin = new URL(pageUrl).origin;
    return "https://www.google.com/s2/favicons?domain=" + origin + "&sz=" + size;
  } catch {
    return "";
  }
}

/**
 * First: try the site's own favicon/icon files directly (well-known paths).
 * Order returned is the probing order -- classic favicon formats first, then
 * the higher-res touch-icon variants, then generic "icon.*" conventions.
 * Not affected by third-party favicon-lookup services being down, rate-limited, or wrong.
 */
export function getDirectFaviconUrls(pageUrl: string): string[] {
  try {
    const origin = new URL(pageUrl).origin;
    return [
      origin + "/favicon.ico",
      origin + "/favicon.png",
      origin + "/favicon.svg",
      origin + "/apple-touch-icon.png",
      origin + "/apple-touch-icon-precomposed.png",
      origin + "/icon.png",
      origin + "/icon.svg",
    ];
  } catch {
    return [];
  }
}
