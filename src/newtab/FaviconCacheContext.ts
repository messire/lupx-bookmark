import { createContext, useContext } from "react";

/**
 * Provides access to the resolved favicon cache.
 *
 * getFavicon(url):
 *   undefined  - not yet cached (live fallback chain will be used)
 *   ""         - cached as "no favicon found" (show pin.svg)
 *   "https://..." - cached working favicon URL (use directly)
 *
 * refreshFavicon(url):
 *   Clears the cached entry so the next resolution starts fresh -- call this
 *   right before navigating to a bookmark. A cached "success" isn't proof the
 *   icon is correct (Google S2 returns a generic default icon for sites it
 *   doesn't recognize, which still passes the probe), so this always
 *   invalidates rather than checking whether the previous result "failed".
 */
export interface FaviconCacheApi {
  getFavicon: (url: string) => string | undefined;
  refreshFavicon: (url: string) => void;
}

const noopFaviconCache: FaviconCacheApi = {
  getFavicon: () => undefined,
  refreshFavicon: () => {},
};

export const FaviconCacheContext = createContext<FaviconCacheApi>(noopFaviconCache);

export function useFaviconContext(): FaviconCacheApi {
  return useContext(FaviconCacheContext);
}
