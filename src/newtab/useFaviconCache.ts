import { useState, useEffect, useCallback, useRef } from "react";
import { fetchChromeFavicon, getFaviconFallbackUrl, getDirectFaviconUrls } from "../utils/favicon";

const CACHE_KEY = "faviconCache_v1";

type FaviconCache = Record<string, string>;

/**
 * Probe whether an image URL resolves to a real icon (naturalWidth > 1).
 * Times out after 5 s to avoid hanging on slow/blocked services.
 */
function probeImage(src: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 1);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = src;
  });
}

/**
 * Try each favicon source in order and return the first working URL.
 * Returns "" if none work.
 */
async function resolveUrl(bookmarkUrl: string): Promise<string> {
  // 1. Direct favicon/icon files from the site's own origin (most accurate)
  for (const directUrl of getDirectFaviconUrls(bookmarkUrl)) {
    if (await probeImage(directUrl)) return directUrl;
  }

  // 2. Google S2 -- fallback only: it returns a generic default icon (not an
  // error) for sites it doesn't recognize, so it isn't a reliable signal that
  // the *real* favicon was found.
  const s2Url = getFaviconFallbackUrl(bookmarkUrl, 32);
  if (s2Url && (await probeImage(s2Url))) return s2Url;

  // 3. Chrome internal cache (fetch -> blob URL; chrome:// cannot be used as <img src>)
  const chromeBlobUrl = await fetchChromeFavicon(bookmarkUrl, 32);
  if (chromeBlobUrl) return chromeBlobUrl;

  return "";
}

function loadStoredCache(): Promise<FaviconCache> {
  return new Promise((resolve) => {
    chrome.storage.local.get(CACHE_KEY, (result) => {
      resolve((result[CACHE_KEY] as FaviconCache) ?? {});
    });
  });
}

/**
 * Manages a persistent favicon cache in chrome.storage.local.
 *
 * On mount: loads the existing cache so already-known icons render instantly.
 * Whenever bookmarkUrls changes: re-resolves *every* bookmark's favicon in the
 *   background (not just ones missing from the cache) and persists results.
 *   This is intentional -- a stored favicon isn't proof it's the real one
 *   (Google S2 returns a generic default icon that still "succeeds" the
 *   probe), so every page load gets a fresh background re-check rather than
 *   trusting whatever was cached before.
 *
 * Returns getFavicon(url):
 *   undefined  - not yet resolved (caller should use live fallback chain)
 *   ""         - no favicon found
 *   "https://..." - the working favicon URL to use directly
 */
export function useFaviconCache(bookmarkUrls: string[]): {
  getFavicon: (url: string) => string | undefined;
  refreshFavicon: (url: string) => void;
} {
  const [cache, setCache] = useState<FaviconCache>({});
  const probingRef = useRef(false);

  // Load from storage on mount so already-known icons render immediately.
  useEffect(() => {
    loadStoredCache().then((stored) => setCache(stored));
  }, []);

  // Re-verify every bookmark's favicon in the background whenever the
  // bookmark list changes (including on every page load, since this effect
  // re-runs on mount).
  const urlsKey = bookmarkUrls.join(",");
  useEffect(() => {
    if (bookmarkUrls.length === 0) return;
    if (probingRef.current) return;

    let cancelled = false;
    probingRef.current = true;

    (async () => {
      const stored = await loadStoredCache();
      const updates: FaviconCache = { ...stored };

      for (const url of bookmarkUrls) {
        if (cancelled) break;
        updates[url] = await resolveUrl(url);
      }

      if (!cancelled) {
        await chrome.storage.local.set({ [CACHE_KEY]: updates });
        setCache(updates);
      }
      probingRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
    // urlsKey intentionally used instead of bookmarkUrls array to avoid reference churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey]);

  const getFavicon = useCallback(
    (url: string): string | undefined => {
      if (!(url in cache)) return undefined;
      return cache[url];
    },
    [cache],
  );

  /**
   * Clears the cached favicon for a URL, forcing a fresh resolution.
   *
   * Called on every bookmark click: a cached "success" is not proof the icon
   * is actually correct (Google S2's generic default icon passes the same
   * probe as a real favicon), so trust is re-earned on every visit rather
   * than gated behind an unreliable "did it fail" check.
   */
  const refreshFavicon = useCallback((url: string) => {
    setCache((prev) => {
      if (!(url in prev)) return prev;
      const next = { ...prev };
      delete next[url];
      return next;
    });

    chrome.storage.local.get(CACHE_KEY, (result) => {
      const stored = (result[CACHE_KEY] as FaviconCache) ?? {};
      if (!(url in stored)) return;
      const next = { ...stored };
      delete next[url];
      chrome.storage.local.set({ [CACHE_KEY]: next });
    });
  }, []);

  return { getFavicon, refreshFavicon };
}
