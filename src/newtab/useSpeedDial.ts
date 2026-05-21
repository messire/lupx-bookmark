import { useState, useEffect } from "react";
import { MAX_SLOTS } from "../types";
import type { SpeedDialSlot } from "../types";

interface UseSpeedDialResult {
  slots: SpeedDialSlot[];          // visible slice: indices 0..(visibleCount-1)
  setSlot: (index: number, url: string, title: string) => Promise<void>;
  clearSlot: (index: number) => Promise<void>;
  swapSlots: (indexA: number, indexB: number) => Promise<void>;
}

const STORAGE_KEY = "speedDial";

function makeAllSlots(): SpeedDialSlot[] {
  return Array.from({ length: MAX_SLOTS }, (_, i) => ({
    id: String(i),
    url: null,
    title: null,
  }));
}

function pad(stored: SpeedDialSlot[]): SpeedDialSlot[] {
  // Ensure we always have exactly MAX_SLOTS entries
  const base = stored.slice(0, MAX_SLOTS);
  while (base.length < MAX_SLOTS) {
    base.push({ id: String(base.length), url: null, title: null });
  }
  // Re-sync ids with position in case storage got corrupted
  return base.map((s, i) => ({ ...s, id: String(i) }));
}

/**
 * Manages a fixed pool of MAX_SLOTS (64) speed dial slots.
 * Each slot has a permanent index (0–63) — its id.
 * The caller passes visibleCount (columns × rows); only that many slots are returned.
 * Slots outside the visible range are preserved in storage untouched.
 */
export function useSpeedDial(visibleCount: number): UseSpeedDialResult {
  const [allSlots, setAllSlots] = useState<SpeedDialSlot[]>(makeAllSlots);

  useEffect(() => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      if (result[STORAGE_KEY]) {
        setAllSlots(pad(result[STORAGE_KEY] as SpeedDialSlot[]));
      }
    });
  }, []);

  async function persist(next: SpeedDialSlot[]) {
    setAllSlots(next);
    await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  }

  async function setSlot(index: number, url: string, title: string) {
    const next = [...allSlots];
    next[index] = { ...next[index], url, title };
    await persist(next);
  }

  async function clearSlot(index: number) {
    const next = [...allSlots];
    next[index] = { ...next[index], url: null, title: null };
    await persist(next);
  }

  async function swapSlots(indexA: number, indexB: number) {
    if (indexA === indexB) return;
    const next = [...allSlots];
    const { url: urlA, title: titleA } = next[indexA];
    next[indexA] = { ...next[indexA], url: next[indexB].url, title: next[indexB].title };
    next[indexB] = { ...next[indexB], url: urlA, title: titleA };
    await persist(next);
  }

  return {
    slots: allSlots.slice(0, visibleCount),
    setSlot,
    clearSlot,
    swapSlots,
  };
}
