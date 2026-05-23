import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWallpapers } from "./useWallpapers";

// ── fetch mock ────────────────────────────────────────────────────────────

function mockFetch(names: string[]) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(names),
  } as Response);
}

function mockFetchFailure() {
  globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("useWallpapers — initial state", () => {
  it("returns an empty array before the fetch resolves", () => {
    // Hang the fetch indefinitely so we can observe the pending state
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWallpapers());

    expect(result.current).toEqual([]);
  });
});

describe("useWallpapers — successful fetch", () => {
  it("returns one Wallpaper entry per name in the JSON", async () => {
    mockFetch(["mountains.jpg", "ocean.jpg", "forest.jpg"]);

    const { result } = renderHook(() => useWallpapers());
    await act(async () => {});

    expect(result.current).toHaveLength(3);
  });

  it("maps each name to the correct chrome-extension URL", async () => {
    mockFetch(["mountains.jpg"]);

    const { result } = renderHook(() => useWallpapers());
    await act(async () => {});

    expect(result.current[0].name).toBe("mountains.jpg");
    // setup.ts mocks getURL as chrome-extension://test/<path>
    expect(result.current[0].url).toBe("chrome-extension://test/wallpapers/mountains.jpg");
  });

  it("fetches wallpapers.json via chrome.runtime.getURL", async () => {
    mockFetch([]);

    renderHook(() => useWallpapers());
    await act(async () => {});

    expect(fetch).toHaveBeenCalledWith("chrome-extension://test/wallpapers.json");
  });

  it("returns an empty array when the JSON contains an empty list", async () => {
    mockFetch([]);

    const { result } = renderHook(() => useWallpapers());
    await act(async () => {});

    expect(result.current).toEqual([]);
  });
});

describe("useWallpapers — failed fetch", () => {
  it("returns an empty array when the network request fails", async () => {
    mockFetchFailure();

    const { result } = renderHook(() => useWallpapers());
    await act(async () => {});

    expect(result.current).toEqual([]);
  });
});

describe("useWallpapers — ordering", () => {
  it("preserves the order returned by wallpapers.json", async () => {
    const names = ["c.jpg", "a.jpg", "b.jpg"];
    mockFetch(names);

    const { result } = renderHook(() => useWallpapers());
    await act(async () => {});

    expect(result.current.map((w) => w.name)).toEqual(names);
  });
});
