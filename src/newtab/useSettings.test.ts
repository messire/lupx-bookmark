import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSettings } from "./useSettings";
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from "../types";
import { seedStorage, fireStorageChange } from "../test/setup";

const STORAGE_KEY = "settings_v1";

/** Build a valid stored settings object (with __version). */
function stored(patch: Partial<typeof DEFAULT_SETTINGS> = {}) {
  return { ...DEFAULT_SETTINGS, ...patch, __version: SETTINGS_VERSION };
}

describe("useSettings", () => {
  // ── Initial state ─────────────────────────────────────────────────────────

  it("initializes with DEFAULT_SETTINGS when storage is empty", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("loads settings persisted in chrome.storage.local", async () => {
    seedStorage("local", { [STORAGE_KEY]: stored({ showTitles: false, theme: "dark" }) });

    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    expect(result.current.settings.showTitles).toBe(false);
    expect(result.current.settings.theme).toBe("dark");
  });

  it("merges stored values with defaults for missing keys", async () => {
    seedStorage("local", { [STORAGE_KEY]: stored({ theme: "light" }) });

    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    expect(result.current.settings.theme).toBe("light");
    expect(result.current.settings.showTitles).toBe(DEFAULT_SETTINGS.showTitles);
    expect(result.current.settings.itemsPerRow).toBe(DEFAULT_SETTINGS.itemsPerRow);
  });

  it("falls back to defaults when stored version does not match", async () => {
    seedStorage("local", {
      [STORAGE_KEY]: { ...DEFAULT_SETTINGS, theme: "dark", __version: 999 },
    });

    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    // Stale version → ignore and use defaults
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  // ── updateSettings ────────────────────────────────────────────────────────

  it("updateSettings applies the patch to the current settings", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    act(() => {
      result.current.updateSettings({ showTitles: false });
    });

    expect(result.current.settings.showTitles).toBe(false);
  });

  it("updateSettings preserves keys not included in the patch", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    act(() => {
      result.current.updateSettings({ theme: "dark" });
    });

    expect(result.current.settings.theme).toBe("dark");
    expect(result.current.settings.showTitles).toBe(DEFAULT_SETTINGS.showTitles);
    expect(result.current.settings.itemsPerRow).toBe(DEFAULT_SETTINGS.itemsPerRow);
  });

  it("updateSettings persists the full settings object with __version to chrome.storage.local", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    act(() => {
      result.current.updateSettings({ theme: "dark" });
    });

    // Advance past the debounce window.
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
      [STORAGE_KEY]: expect.objectContaining({
        theme: "dark",
        __version: SETTINGS_VERSION,
        // Full object — all keys present
        showTitles: DEFAULT_SETTINGS.showTitles,
        itemsPerRow: DEFAULT_SETTINGS.itemsPerRow,
      }),
    });

    vi.useRealTimers();
  });

  it("debounces rapid updateSettings calls into a single write", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    // Count writes already done during initial load
    const setMock = chrome.storage.local.set as ReturnType<typeof vi.fn>;
    const callsBefore = setMock.mock.calls.length;

    act(() => {
      result.current.updateSettings({ theme: "dark" });
      result.current.updateSettings({ theme: "light" });
      result.current.updateSettings({ showTitles: false });
    });

    // No write yet — debounce window still open
    expect(setMock.mock.calls.length).toBe(callsBefore);

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    // Exactly one write for all three rapid changes
    expect(setMock.mock.calls.length).toBe(callsBefore + 1);
    expect(result.current.settings.theme).toBe("light");
    expect(result.current.settings.showTitles).toBe(false);

    vi.useRealTimers();
  });

  // ── Cross-tab reactivity ──────────────────────────────────────────────────

  it("reacts to local storage changes from other tabs for the settings key", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    act(() => {
      fireStorageChange("local", {
        [STORAGE_KEY]: { newValue: stored({ theme: "light" }) },
      });
    });

    expect(result.current.settings.theme).toBe("light");
  });

  it("ignores local storage changes for unrelated keys", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    act(() => {
      fireStorageChange("local", {
        accordionGroups: { newValue: [] },
      });
    });

    // Settings should be unchanged
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("ignores sync storage changes entirely", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    act(() => {
      fireStorageChange("sync", {
        [STORAGE_KEY]: { newValue: stored({ theme: "dark" }) },
      });
    });

    expect(result.current.settings.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it("removes the onChanged listener on unmount", async () => {
    const { unmount } = renderHook(() => useSettings());
    await act(async () => {});

    unmount();

    expect(chrome.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
  });
});
