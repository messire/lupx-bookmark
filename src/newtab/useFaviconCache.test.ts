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

  // Mock URL.createObjectURL — fetchChromeFavicon calls this when it gets a real icon blob.
  // Return a stable URL containing "favicon2" so tests can assert the chrome cache was used.
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:favicon2-cached");

  // Mock fetch — fetchChromeFavicon calls fetch(chrome://favicon2/...).
  // jsdom does not support the chrome:// protocol, so we intercept it here.
  // Hit  → blob > 100 bytes  (fetchChromeFavicon returns a blob URL)
  // Miss → blob ≤ 100 bytes  (fetchChromeFavicon returns "" and falls through)
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

  it("loads a pre-existing cache from chrome.storage.local", async () => {
    seedStorage("local", {
      [CACHE_KEY]: { "https://example.com": "https://cdn.example.com/favicon.ico" },
    });

    const { result } = await mount(["https://example.com"]);

    await waitFor(() => {
      return result.current.getFavicon("https://example.com") !== undefined;
    });

    expect(result.current.getFavicon("https://example.com")).toBe(
      "https://cdn.example.com/favicon.ico",
    );
  });
});

describe("useFaviconCache — probing", () => {
  it("resolves chrome://favicon2/ first when it returns a hit", async () => {
    mockProbe("favicon2", "hit");

    const { result } = await mount(["https://example.com"]);

    await waitFor(() => result.current.getFavicon("https://example.com") !== undefined);

    expect(result.current.getFavicon("https://example.com")).toContain("favicon2");
  });

  it("falls back to Google S2 when chrome favicon misses", async () => {
    mockProbe("favicon2", "miss");
    mockProbe("google.com/s2", "hit");

    const { result } = await mount(["https://example.com"]);

    await waitFor(() => result.current.getFavicon("https://example.com") !== undefined);

    expect(result.current.getFavicon("https://example.com")).toContain("google.com/s2");
  });

  it("stores empty string when all probes miss", async () => {
    mockProbe("favicon2", "miss");
    mockProbe("google.com/s2", "miss");

    const { result } = await mount(["https://nofavicon.example.com"]);

    await waitFor(() => result.current.getFavicon("https://nofavicon.example.com") !== undefined);

    expect(result.current.getFavicon("https://nofavicon.example.com")).toBe("");
  });

  it("does not re-probe URLs already present in storage", async () => {
    seedStorage("local", {
      [CACHE_KEY]: { "https://cached.example.com": "https://cdn.example.com/fav.ico" },
    });

    const { result } = await mount(["https://cached.example.com"]);

    await waitFor(() => result.current.getFavicon("https://cached.example.com") !== undefined);

    // URL was already in cache — no Image instances should have been created
    expect(imageConstructorCalls).toBe(0);
  });

  it("persists resolved URLs to chrome.storage.local", async () => {
    mockProbe("favicon2", "hit");

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

describe("useFaviconCache — getFavicon return values", () => {
  it("returns undefined for a URL not yet in cache", async () => {
    const { result } = await mount([]);
    expect(result.current.getFavicon("https://unknown.example.com")).toBeUndefined();
  });

  it("returns the cached URL string for a known URL", async () => {
    seedStorage("local", {
      [CACHE_KEY]: { "https://example.com": "https://cdn.example.com/fav.ico" },
    });

    const { result } = await mount(["https://example.com"]);

    await waitFor(() => result.current.getFavicon("https://example.com") !== undefined);

    expect(result.current.getFavicon("https://example.com")).toBe(
      "https://cdn.example.com/fav.ico",
    );
  });
});
