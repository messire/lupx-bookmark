import { useState, useEffect, useCallback } from "react";
import { DEFAULT_SETTINGS } from "../types";
import type { Settings } from "../types";

interface UseSettingsResult {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
}

/**
 * Reads and writes user settings via chrome.storage.sync.
 * Falls back to DEFAULT_SETTINGS if nothing is stored yet.
 */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
      setSettings(stored as Settings);
    });

    function onChanged(changes: { [key: string]: chrome.storage.StorageChange }) {
      const patch: Partial<Settings> = {};
      for (const key of Object.keys(changes) as Array<keyof Settings>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (patch as any)[key] = changes[key].newValue;
      }
      setSettings((prev) => ({ ...prev, ...patch }));
    }

    chrome.storage.sync.onChanged.addListener(onChanged);
    return () => chrome.storage.sync.onChanged.removeListener(onChanged);
  }, []);

  // useCallback([], []) is correct: functional setSettings needs no snapshot of
  // `settings`, so updateSettings has no dependency on component state at all.
  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    await chrome.storage.sync.set(patch);
  }, []);

  return { settings, updateSettings };
}
