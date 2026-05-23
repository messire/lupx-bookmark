import { useState, useEffect, useRef, useCallback } from "react";
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from "../types";
import type { Settings } from "../types";

const STORAGE_KEY = "settings_v1";
const DEBOUNCE_MS = 300;

// Stored shape includes a version field to detect schema changes.
type StoredSettings = Settings & { __version: number };

export interface UseSettingsResult {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

// ── Storage I/O ───────────────────────────────────────────────────────────

async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const stored = result[STORAGE_KEY] as StoredSettings | undefined;

      if (!stored || stored.__version !== SETTINGS_VERSION) {
        // Fresh install or schema incompatibility — start from defaults.
        resolve(DEFAULT_SETTINGS);
        return;
      }

      // Strip the internal version field, then merge with defaults so any
      // new keys added since the user's last save get their default values.
      const { __version: _, ...data } = stored;
      resolve({ ...DEFAULT_SETTINGS, ...data });
    });
  });
}

async function saveSettings(settings: Settings): Promise<void> {
  const toStore: StoredSettings = { ...settings, __version: SETTINGS_VERSION };
  await chrome.storage.local.set({ [STORAGE_KEY]: toStore });
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * Reads and writes user settings via chrome.storage.local.
 *
 * Design notes:
 * - Always writes the full settings object (+ __version) so every save is
 *   self-contained and order-independent.
 * - Writes are debounced (300 ms) so rapid changes (sliders, toggles) are
 *   batched into a single storage write.
 * - updateSettings is synchronous from the caller's perspective: React state
 *   updates immediately and the storage write happens in the background.
 * - onChanged listener is scoped strictly to STORAGE_KEY so unrelated
 *   chrome.storage.local writes never bleed into Settings state.
 */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Stable ref so updateSettings never captures stale state.
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);

  // Timer ref for the debounced write.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    loadSettings().then((loaded) => {
      settingsRef.current = loaded;
      setSettings(loaded);
    });
  }, []);

  // ── Flush pending write on unmount ──────────────────────────────────────
  // If the tab closes while a debounce is in flight, write immediately so
  // the last change isn't lost.
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        saveSettings(settingsRef.current).catch(() => {});
      }
    };
  }, []);

  // ── Cross-tab sync ──────────────────────────────────────────────────────
  // Scoped to our specific storage key — unrelated local storage writes
  // (e.g. accordion groups) are ignored entirely.
  useEffect(() => {
    function onChanged(changes: Record<string, chrome.storage.StorageChange>, area: string) {
      if (area !== "local" || !(STORAGE_KEY in changes)) return;

      const stored = changes[STORAGE_KEY].newValue as StoredSettings | undefined;
      if (!stored || stored.__version !== SETTINGS_VERSION) return;

      const { __version: _, ...data } = stored;
      const updated = { ...DEFAULT_SETTINGS, ...data };

      // Skip if this change originated from the current tab (values identical).
      if (JSON.stringify(updated) === JSON.stringify(settingsRef.current)) return;

      settingsRef.current = updated;
      setSettings(updated);
    }

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  // ── updateSettings ──────────────────────────────────────────────────────
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);

    // Debounce: cancel any pending timer and schedule a fresh write.
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      saveSettings(next).catch((err) => {
        console.error("[lupx] Failed to save settings:", err);
      });
    }, DEBOUNCE_MS);
  }, []);

  return { settings, updateSettings };
}
