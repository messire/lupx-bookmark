import { createContext, useContext } from "react";

/**
 * Provides access to the resolved favicon cache.
 *
 * Return value of getFavicon(url):
 *   undefined  - not yet cached (live fallback chain will be used)
 *   ""         - cached as "no favicon found" (show pin.svg)
 *   "https://..." - cached working favicon URL (use directly)
 */
export const FaviconCacheContext = createContext<(url: string) => string | undefined>(
  () => undefined,
);

export function useFaviconContext(): (url: string) => string | undefined {
  return useContext(FaviconCacheContext);
}
