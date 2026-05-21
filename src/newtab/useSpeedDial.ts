import { useState, useEffect } from "react";
import { DEFAULT_SLOT_COUNT } from "../types";
import type { SpeedDialSlot } from "../types";

interface UseSpeedDialResult {
  slots: SpeedDialSlot[];
  setSlot: (id: string, url: string, title: string) => Promise<void>;
  clearSlot: (id: string) => Promise<void>;
}

const STORAGE_KEY = "speedDial";

function makeEmptySlots(count: number): SpeedDialSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    url: null,
    title: null,
  }));
}

/**
 * Manages speed dial slots stored in chrome.storage.sync.
 * On first run, initialises DEFAULT_SLOT_COUNT empty slots.
 */
export function useSpeedDial(): UseSpeedDialResult {
  const [slots, setSlots] = useState<SpeedDialSlot[]>(makeEmptySlots(DEFAULT_SLOT_COUNT));

  // Load from storage on mount
  useEffect(() => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      if (result[STORAGE_KEY]) {
        setSlots(result[STORAGE_KEY] as SpeedDialSlot[]);
      }
    });
  }, []);

  async function persist(next: SpeedDialSlot[]) {
    setSlots(next);
    await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  }

  async function setSlot(id: string, url: string, title: string) {
    const next = slots.map((s) =>
      s.id === id ? { ...s, url, title } : s
    );
    await persist(next);
  }

  async function clearSlot(id: string) {
    const next = slots.map((s) =>
      s.id === id ? { ...s, url: null, title: null } : s
    );
    await persist(next);
  }

  return { slots, setSlot, clearSlot };
}
