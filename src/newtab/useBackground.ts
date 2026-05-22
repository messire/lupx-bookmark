import { useEffect, useState } from "react";
import type { Background } from "../types";

export const BG_IMAGE_STORAGE_KEY = "backgroundImage";

// ── Luminance helpers ──────────────────────────────────────────────────────

function hexToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * hexToLinear(r) + 0.7152 * hexToLinear(g) + 0.0722 * hexToLinear(b);
}

type BgAttribute = "light" | "dark" | "image" | "none";

function getBgAttribute(background: Background): BgAttribute {
  switch (background.type) {
    case "none":
      return "none";
    case "color":
      return hexLuminance(background.color) > 0.4 ? "light" : "dark";
    case "gradient":
      return "image"; // treat like image — use white text + shadow, works on any gradient
    case "image":
      return "image";
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * Applies the background to document.body and sets data-bg on <html>
 * so CSS can adapt text colours automatically:
 *   data-bg="dark"  → white text
 *   data-bg="light" → dark text
 *   data-bg="image" → white text + text-shadow (works on any image)
 *   data-bg="none"  → theme default
 */
export function useBackground(background: Background) {
  const [localImageData, setLocalImageData] = useState<string | null>(null);

  // Initial load from local storage
  useEffect(() => {
    if (background.type === "image" && !background.imageUrl) {
      chrome.storage.local.get(BG_IMAGE_STORAGE_KEY, (result) => {
        setLocalImageData((result[BG_IMAGE_STORAGE_KEY] as string) ?? null);
      });
    } else {
      setLocalImageData(null);
    }
  }, [background.type, background.imageUrl]);

  // React to file uploads that don't change type/imageUrl deps
  useEffect(() => {
    function onChanged(changes: Record<string, chrome.storage.StorageChange>, area: string) {
      if (area !== "local" || !(BG_IMAGE_STORAGE_KEY in changes)) return;
      if (background.type === "image" && !background.imageUrl) {
        setLocalImageData(changes[BG_IMAGE_STORAGE_KEY].newValue ?? null);
      }
    }
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [background.type, background.imageUrl]);

  // Apply background to body + set data-bg attribute
  useEffect(() => {
    const body = document.body;
    body.style.backgroundColor = "";
    body.style.backgroundImage = "";
    body.style.backgroundSize = "";
    body.style.backgroundPosition = "";
    body.style.backgroundRepeat = "";

    switch (background.type) {
      case "color":
        body.style.backgroundColor = background.color;
        break;
      case "gradient": {
        const { from, to, angle } = background.gradient;
        body.style.backgroundImage = `linear-gradient(${angle}deg, ${from}, ${to})`;
        break;
      }
      case "image": {
        const src = background.imageUrl || localImageData;
        if (src) {
          body.style.backgroundImage = `url(${JSON.stringify(src)})`;
          body.style.backgroundSize = "cover";
          body.style.backgroundPosition = "center";
          body.style.backgroundRepeat = "no-repeat";
        }
        break;
      }
    }

    document.documentElement.setAttribute("data-bg", getBgAttribute(background));
  }, [background, localImageData]);
}

/**
 * Saves a file as base64 to chrome.storage.local.
 * Returns the data URL for immediate preview use.
 */
export async function saveBackgroundImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await chrome.storage.local.set({ [BG_IMAGE_STORAGE_KEY]: dataUrl });
      resolve(dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
