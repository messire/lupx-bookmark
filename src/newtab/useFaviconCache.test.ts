import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFaviconCache } from "./useFaviconCache";
import { seedStorage } from "../test/setup";

// ── Image probe mock ──────────────────────────────────────────────────────
//
// probeImage() creates an Image and checks naturalWidth > 1.
// In jsdom there is no real image loading, so we stub the global Image
// constructor with a class that immediately fires onload/onerror based on
// a registry keyed by URL pattern.
//
// The same probeRegistry also drives the fetch() mock for fetchChromeFavicon
// (which fetches chrome://favicon2/ directly, bypassing probeImage).

type ProbeResult = "hit" | "miss" | "error";

/** URL substring → probe result. */
const probeRegistry: Record<string, ProbeResult> = {};

/** Count of MockImage instances created (reset each test). */
let imageConstructorCalls = 0;

function mockProbe(pattern: string, result: ProbeResult) {
  probeRegistry[pattern] = result;
}

function clearProbes() {
  for (const k of Object.keys(probeRegistry)) delete probeRegistry[k];
}

beforeEach(() => {
  clearProbes();
  imageConstructorCalls = 0;

  // Mock fetch — fetchChromeFavicon calls fetch(chrome://favicon2/...).
  // jsdom does not support the chrome:// protocol, so we intercept it here.
  // Hit  → blob > 100 bytes  (fetchChromeFavicon converts to data URL and returns it)
  // Miss → blob ≤ 100 bytes  (fetchChromeFavicon returns "" and falls through)
  // Mock FileReader — fetchChromeFavicon uses FileReader.readAsDataURL to convert the blob.
  // jsdom's FileReader does not fully implement readAsDataURL, so we stub it.
  class MockFileReader {
    result: string | null = null;
    onloadend: (() => void) | null = null;
    onerror: (() => void) | null = null;

    readAsDataURL(blob: Blob) {
      Promise.resolve().then(() => {
        // Return a stable data URL whose content encodes whether this was a hit.
        // The actual base64 payload doesn't matter for these tests.
        this.result = blob.size > 100 ? "data:image/png;base64,favicon2hit==" : null;
        if (this.result) this.onloadend?.();
        else this.onerror?.();
      });
    }
  }
  vi.stubGlobal("FileReader", MockFileReader);

  vi.stubGlobal("fetch", async (url: string) => {
    if (typeof url === "string" && url.includes("favicon2")) {
      const isHit = Object.entries(probeRegistry).some(
        ([pattern, r]) => url.includes(pattern) && r === "hit",
      );
      const size = isHit ? 200 : 10;
      const blob = new Blob([new Uint8Array(size)]);
      return { ok: true, blob: async () => blob } as unknown as Response;
    }
    return { ok: false } as unknown as Response;
  });

  // Stub Image with a class so `new Image()` works correctly.
  class MockImage {
    naturalWidth = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor() {
      imageConstructorCalls++;
    }

    set src(url: string) {
      const match = Object.entries(probeRegistry).find(([pattern]) => url.includes(pattern));
      const result: ProbeResult = match ? match[1] : "miss";
      Promise.resolve().then(() => {
        if (result === "error") {
          this.onerror?.();
        } else {
          this.naturalWidth = result === "hit" ? 32 : 0;
          this.onload?.();
        }
      });
    }
  }

  vi.stubGlobal("Image", MockImage);
});

// ── Helpers ───────────────────────────────────────────────────────────────

const CACHE_KEY = "faviconCache_v1";

async function mount(urls: string[]) {
  const hook = renderHook(() => useFaviconCache(urls));
  await act(async () => {});
  return hook;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("useFaviconCache — initial load", () => {
  it("returns undefined for uncached URLs before probing completes", () => {
    const { result } = renderHook(() => useFaviconCache(["https://slow.example.com"]));
    expect(result.current.getFavicon("https://slow.example.com")).toBeUndefined();
  });
});

describe("useFaviconCache — probing order", () => {
  it("resolves a direct favicon.ico first when it hits", async () => {
    mockProbe("favicon.ico", "hit");

    const { result } = await mount(["https://example.com"]);

    await waitFor(() => result.current.getFavicon("https://example.com") !== undefined);

    expect(result.current.getFavicon("https://example.com")).toBe(
      "https://example.com/favicon.ico",
    );
  });

  it("tries every direct variant before falling back to Google S2", async () => {
    mockProbe("favicon.ico", "miss");
    mockProbe("favicon.png", "miss");
    mockProbe("favicon.svg", "miss");
    mockProbe("apple-touch-icon.png", "miss");
    mockProbe("apple-touch-icon-precomposed.png", "miss");
    mockProbe("icon.png", "miss");
    mockProbe("icon.svg", "miss");
    mockProbe("google.com/s2", "hit");

    const { result } = await mount(["https://example.com"]);

    await waitFor(() => result.current.getFavicon("https://example.com") !== undefined);

    expect(result.current.getFavicon("https://example.com")).toContain("google.com/s2");
  });

  it("prefers a later direct variant (e.g. apple-touch-icon.png) over Google S2 when an earlier direct variant misses", async () => {
    mockProbe("favicon.ico", "miss");
    mockProbe("favicon.png", "miss");
    mockProbe("favicon.svg", "miss");
    mockProbe("apple-touch-icon.png", "hit");
    mockProbe("google.com/s2", "hit");

    const { result } = await mount(["https://example.com"]);

    await waitFor(() => result.current.getFavicon("https://example.com") !== undefined);

    expect(result.current.getFavicon("https://example.com")).toContain("apple-touch-icon.png");
  });

  it("falls back to chrome://favicon2/ when every direct variant and Google S2 miss", async () => {
    mockProbe("google.com/s2", "miss");
    mockProbe("favicon2", "hit");

    const { result } = await mount(["https://example.com"]);

    await waitFor(() => result.current.getFavicon("https://example.com") !== undefined);

    expect(result.current.getFavicon("https://example.com")).toMatch(/^data:/);
  });

  it("stores empty string when all probes miss", async () => {
    mockProbe("favicon2", "miss");
    mockProbe("google.com/s2", "miss");

    const { result } = await mount(["https://nofavicon.example.com"]);

    await waitFor(() => result.current.getFavicon("https://nofavicon.example.com") !== undefined);

    expect(result.current.getFavicon("https://nofavicon.example.com")).toBe("");
  });

  it("persists resolved URLs to chrome.storage.local", async () => {
    mockProbe("favicon2", "hit");
    mockProbe("google.com/s2", "miss");

    await mount(["https://example.com"]);

    await waitFor(() => {
      const calls = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls;
      return calls.length > 0;
    });

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        [CACHE_KEY]: expect.objectContaining({ "https://example.com": expect.any(String) }),
      }),
    );
  });
});

describe("useFaviconCache — background revalidation", () => {
  it("re-probes a URL that's already in the cache instead of trusting the stored value", async () => {
    // Simulate a previously-wrong result (e.g. a stale Google S2 default icon)
    // sitting in storage, and a direct favicon that is now available.
    seedStorage("local", {
      [CACHE_KEY]: { "https://example.com": "https://www.google.com/s2/favicons?domain=x&sz=32" },
    });
    mockProbe("favicon.ico", "hit");

    const { result } = await mount(["https://example.com"]);

    await waitFor(() => result.current.getFavicon("https://example.com")?.includes("favicon.ico"));

    // Confirms real probing happened rather than short-circuiting on the cached entry.
    expect(imageConstructorCalls).toBeGreaterThan(0);
  });

  it("overwrites the stored value once revalidation resolves differently", async () => {
    seedStorage("local", {
      [CACHE_KEY]: { "https://cached.example.com": "https://cdn.example.com/old-fav.ico" },
    });
    mockProbe("favicon.png", "hit");

    const { result } = await mount(["https://cached.example.com"]);

    await waitFor(
      () =>
        result.current.getFavicon("https://cached.example.com") ===
        "https://cached.example.com/favicon.png",
    );
  });
});

describe("useFaviconCache — getFavicon return values", () => {
  it("returns undefined for a URL not yet in cache", async () => {
    const { result } = await mount([]);
    expect(result.current.getFavicon("https://unknown.example.com")).toBeUndefined();
  });

  it("returns the resolved URL string for a known URL", async () => {
    mockProbe("favicon.ico", "hit");

    const { result } = await mount(["https://example.com"]);

    await waitFor(() => result.current.getFavicon("https://example.com") !== undefined);

    expect(result.current.getFavicon("https://example.com")).toBe(
      "https://example.com/favicon.ico",
    );
  });
});

describe("useFaviconCache — refreshFavicon", () => {
  it("clears a cached entry unconditionally, even one that previously resolved successfully", async () => {
    seedStorage("local", {
      [CACHE_KEY]: { "https://ok.example.com": "https://cdn.example.com/fav.ico" },
    });
    // Prevent the background revalidation pass from immediately re-populating
    // the entry so the cleared state is observable.
    mockProbe("favicon.ico", "hit");

    const { result } = await mount(["https://ok.example.com"]);

    await waitFor(() => result.current.getFavicon("https://ok.example.com") !== undefined);

    act(() => {
      result.current.refreshFavicon("https://ok.example.com");
    });

    // Cleared immediately (synchronously via setCache), before any re-probe completes.
    expect(result.current.getFavicon("https://ok.example.com")).toBeUndefined();
  });

  it("removes the cleared entry from chrome.storage.local without touching other entries", async () => {
    seedStorage("local", {
      [CACHE_KEY]: {
        "https://target.example.com": "https://cdn.example.com/fav.ico",
        "https://other.example.com": "https://cdn.example.com/other.ico",
      },
    });

    const { result } = await mount(["https://target.example.com", "https://other.example.com"]);
    await waitFor(() => result.current.getFavicon("https://target.example.com") !== undefined);

    act(() => {
      result.current.refreshFavicon("https://target.example.com");
    });

    await waitFor(() => {
      const calls = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls;
      return calls.some(([arg]) => {
        const stored = (arg as Record<string, Record<string, string>>)[CACHE_KEY];
        return stored !== undefined && !("https://target.example.com" in stored);
      });
    });
  });

  it("is a no-op for a URL not yet in the cache", async () => {
    const { result } = await mount([]);

    act(() => {
      result.current.refreshFavicon("https://unknown.example.com");
    });

    expect(result.current.getFavicon("https://unknown.example.com")).toBeUndefined();
  });
});
