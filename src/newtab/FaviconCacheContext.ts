import { createContext, useContext } from "react";

/**
 * Provides access to the resolved favicon cache.
 *
 * getFavicon(url):
 *   undefined  - not yet cached (live fallback chain will be used)
 *   ""         - cached as "no favicon found" (show pin.svg)
 *   "https://..." - cached working favicon URL (use directly)
 *
 * retryFavicon(url):
 *   Clears a previously-failed ("") cache entry so it gets a fresh attempt --
 *   call this right before navigating to a bookmark whose icon never resolved.
 *   No-op for URLs that resolved successfully or aren't cached yet.
 */
export interface FaviconCacheApi {
  getFavicon: (url: string) => string | undefined;
  retryFavicon: (url: string) => void;
}

const noopFaviconCache: FaviconCacheApi = {
  getFavicon: () => undefined,
  retryFavicon: () => {},
};

export const FaviconCacheContext = createContext<FaviconCacheApi>(noopFaviconCache);

export function useFaviconContext(): FaviconCacheApi {
  return useContext(FaviconCacheContext);
}
