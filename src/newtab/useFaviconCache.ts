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
  // 1. Google S2
  const s2Url = getFaviconFallbackUrl(bookmarkUrl, 32);
  if (s2Url && (await probeImage(s2Url))) return s2Url;

  // 2. Direct favicon.ico / favicon.png from the site's own origin
  for (const directUrl of getDirectFaviconUrls(bookmarkUrl)) {
    if (await probeImage(directUrl)) return directUrl;
  }

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
 * On mount: loads the existing cache.
 * Whenever bookmarkUrls changes: probes any URLs that are not yet cached
 *   (sequentially, in the background) and persists results.
 *
 * Returns getFavicon(url):
 *   undefined  - not yet resolved (caller should use live fallback chain)
 *   ""         - no favicon found
 *   "https://..." - the working favicon URL to use directly
 */
export function useFaviconCache(bookmarkUrls: string[]): {
  getFavicon: (url: string) => string | undefined;
  retryFavicon: (url: string) => void;
} {
  const [cache, setCache] = useState<FaviconCache>({});
  const probingRef = useRef(false);

  // Load from storage on mount
  useEffect(() => {
    loadStoredCache().then((stored) => setCache(stored));
  }, []);

  // Probe any uncached URLs whenever the bookmark list changes

  const urlsKey = bookmarkUrls.join(",");
  useEffect(() => {
    if (bookmarkUrls.length === 0) return;
    if (probingRef.current) return;

    let cancelled = false;
    probingRef.current = true;

    (async () => {
      const stored = await loadStoredCache();
      const missing = bookmarkUrls.filter((url) => !(url in stored));

      if (missing.length === 0 || cancelled) {
        probingRef.current = false;
        // Still sync in-memory cache with storage (handles hot-reloads)
        if (!cancelled) setCache(stored);
        return;
      }

      const updates: FaviconCache = { ...stored };
      for (const url of missing) {
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
   * Invalidates a previously-failed ("") favicon lookup for a URL.
   *
   * Called right before navigating to a bookmark: if the icon never resolved,
   * clearing the cache entry makes the current render fall back to the live
   * probing chain (BookmarkCard / MiniIcon already do this for any URL missing
   * from the cache), and makes the *next* page load retry it from scratch --
   * useful because the site visit that follows this click often teaches Chrome
   * the real favicon, or a favicon service that failed transiently may have
   * since recovered.
   *
   * No-op if the URL isn't cached yet or previously resolved successfully --
   * this is a retry for stuck failures, not a refresh on every click.
   */
  const retryFavicon = useCallback((url: string) => {
    setCache((prev) => {
      if (prev[url] !== "") return prev;
      const next = { ...prev };
      delete next[url];
      return next;
    });

    chrome.storage.local.get(CACHE_KEY, (result) => {
      const stored = (result[CACHE_KEY] as FaviconCache) ?? {};
      if (stored[url] !== "") return;
      const next = { ...stored };
      delete next[url];
      chrome.storage.local.set({ [CACHE_KEY]: next });
    });
  }, []);

  return { getFavicon, retryFavicon };
}
