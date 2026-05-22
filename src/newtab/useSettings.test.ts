import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSettings } from "./useSettings";
import { DEFAULT_SETTINGS } from "../types";
import { seedStorage, fireStorageChange } from "../test/setup";

describe("useSettings", () => {
  // ── Initial state ───────────────────────────────────────────────────────

  it("initializes with DEFAULT_SETTINGS when storage is empty", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("loads settings persisted in chrome.storage.sync", async () => {
    seedStorage("sync", { showTitles: false, theme: "dark" });

    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    expect(result.current.settings.showTitles).toBe(false);
    expect(result.current.settings.theme).toBe("dark");
  });

  it("merges stored values with defaults for missing keys", async () => {
    seedStorage("sync", { theme: "light" });

    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    // theme came from storage
    expect(result.current.settings.theme).toBe("light");
    // everything else is the default
    expect(result.current.settings.showTitles).toBe(DEFAULT_SETTINGS.showTitles);
    expect(result.current.settings.itemsPerRow).toBe(DEFAULT_SETTINGS.itemsPerRow);
  });

  // ── updateSettings ──────────────────────────────────────────────────────

  it("updateSettings applies the patch to the current settings", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    await act(async () => {
      await result.current.updateSettings({ showTitles: false });
    });

    expect(result.current.settings.showTitles).toBe(false);
  });

  it("updateSettings preserves keys not included in the patch", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    await act(async () => {
      await result.current.updateSettings({ theme: "dark" });
    });

    expect(result.current.settings.theme).toBe("dark");
    expect(result.current.settings.showTitles).toBe(DEFAULT_SETTINGS.showTitles);
    expect(result.current.settings.itemsPerRow).toBe(DEFAULT_SETTINGS.itemsPerRow);
  });

  it("updateSettings persists only the patch to chrome.storage.sync", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    await act(async () => {
      await result.current.updateSettings({ theme: "dark" });
    });

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ theme: "dark" });
    // Should not write the full settings object — just the diff.
    expect(chrome.storage.sync.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ showTitles: expect.anything() }),
    );
  });

  // ── Cross-tab reactivity ────────────────────────────────────────────────

  it("reacts to sync storage changes from other tabs", async () => {
    const { result } = renderHook(() => useSettings());
    await act(async () => {});

    act(() => {
      fireStorageChange("sync", { theme: { newValue: "light" } });
    });

    expect(result.current.settings.theme).toBe("light");
  });

  it("removes the onChanged listener on unmount", async () => {
    const { unmount } = renderHook(() => useSettings());
    await act(async () => {});

    unmount();

    expect(chrome.storage.sync.onChanged.removeListener).toHaveBeenCalledTimes(1);
  });
});
