import { useState, useEffect } from "react";

export interface Wallpaper {
  name: string;
  url: string; // chrome.runtime.getURL("wallpapers/<name>")
}

/**
 * Loads the list of built-in wallpapers from wallpapers.json
 * (generated at build time by the Vite plugin in vite.config.ts).
 */
export function useWallpapers(): Wallpaper[] {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);

  useEffect(() => {
    fetch(chrome.runtime.getURL("wallpapers.json"))
      .then((r) => r.json())
      .then((names: string[]) => {
        setWallpapers(
          names.map((name) => ({
            name,
            url: chrome.runtime.getURL(`wallpapers/${name}`),
          })),
        );
      })
      .catch(() => setWallpapers([]));
  }, []);

  return wallpapers;
}
