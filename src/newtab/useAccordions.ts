import { useState, useEffect, useRef, useCallback } from "react";
import type { AccordionGroup, SpeedDialSlot } from "../types";

const STORAGE_KEY = "accordionGroups";
/** Legacy key from the old flat-grid implementation — migrated on first load. */
const LEGACY_KEY = "speedDial";

// ── Helpers ───────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function makeGroup(name: string): AccordionGroup {
  return { id: uid(), name, collapsed: false, items: [] };
}

function makeSlot(url: string, title: string): SpeedDialSlot {
  return { id: uid(), url, title };
}

/**
 * Adjusts the group list to exactly `count` entries:
 * - Adds empty groups if too few.
 * - Removes from the end (with all their items) if too many.
 * Returns the same array reference if no change is needed.
 */
function applyCount(groups: AccordionGroup[], count: number): AccordionGroup[] {
  if (groups.length === count) return groups;
  if (groups.length < count) {
    const next = [...groups];
    while (next.length < count) next.push(makeGroup("New"));
    return next;
  }
  // Decrease: slice removes trailing groups including their items
  return groups.slice(0, count);
}

// ── Storage I/O ───────────────────────────────────────────────────────────

async function loadFromStorage(): Promise<AccordionGroup[] | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve((result[STORAGE_KEY] as AccordionGroup[]) ?? null);
    });
  });
}

async function loadLegacy(): Promise<SpeedDialSlot[] | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(LEGACY_KEY, (result) => {
      resolve((result[LEGACY_KEY] as SpeedDialSlot[]) ?? null);
    });
  });
}

async function saveToStorage(groups: AccordionGroup[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: groups });
}

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UseAccordionsResult {
  groups: AccordionGroup[];
  /** Add a bookmark to a group. */
  addItem: (groupId: string, url: string, title: string) => Promise<void>;
  /**
   * Move a bookmark.
   * Same group → swap positions.
   * Different groups → remove from source, insert at toIdx in target.
   */
  moveItem: (
    fromGroupId: string,
    fromIdx: number,
    toGroupId: string,
    toIdx: number,
  ) => Promise<void>;
  /** Rename a group (persists immediately). */
  renameGroup: (groupId: string, name: string) => Promise<void>;
  /** Toggle the collapsed state of a group. */
  toggleCollapse: (groupId: string) => Promise<void>;
  /** Swap two groups by index. */
  swapGroups: (idxA: number, idxB: number) => Promise<void>;
  /** Delete a group by id (with all its items). */
  deleteGroup: (groupId: string) => Promise<void>;
}

/**
 * Manages accordion groups stored in chrome.storage.local.
 * @param accordionCount The desired number of groups (from Settings).
 *   When this value changes the hook automatically adds/removes groups
 *   to match, permanently deleting trailing groups when count decreases.
 */
export function useAccordions(accordionCount: number): UseAccordionsResult {
  const [groups, setGroups] = useState<AccordionGroup[]>([]);

  // Refs so effects can read the latest values without stale closures.
  const groupsRef = useRef<AccordionGroup[]>([]);
  const isLoadedRef = useRef(false);
  // Always reflects the latest accordionCount so the initial-load effect can
  // read it without listing it as a dep (we only want that effect to run once).
  const accordionCountRef = useRef(accordionCount);
  accordionCountRef.current = accordionCount;

  // ── Persist helper ────────────────────────────────────────────────────
  // useCallback([], []) is correct: only touches groupsRef (stable ref) and
  // setGroups (stable setter) — no component state in the dep chain.
  const persist = useCallback(async (next: AccordionGroup[]) => {
    groupsRef.current = next;
    setGroups(next);
    await saveToStorage(next);
  }, []);

  // ── Initial load + migration ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let loaded = await loadFromStorage();

      if (!loaded) {
        // Try migrating from legacy flat-grid format
        const legacy = await loadLegacy();

        if (legacy?.some((s) => s.url)) {
          const first = makeGroup("Bookmarks");
          first.items = legacy.flatMap((s) => {
            if (!s.url) return [];
            return [makeSlot(s.url, s.title ?? s.url)];
          });
          loaded = [first];
        } else {
          // Fresh install — default starter groups
          loaded = [makeGroup("Work"), makeGroup("Personal"), makeGroup("Tools")];
        }
      }

      if (cancelled) return;

      // Sync with current accordionCount on first load
      const synced = applyCount(loaded, accordionCountRef.current);
      isLoadedRef.current = true;
      await persist(synced);
    })();

    return () => {
      cancelled = true;
    };
  }, [persist]);

  // ── Sync count when accordionCount changes ────────────────────────────
  useEffect(() => {
    if (!isLoadedRef.current) return; // wait until initial load completes
    const synced = applyCount(groupsRef.current, accordionCount);
    if (synced !== groupsRef.current) {
      persist(synced);
    }
  }, [accordionCount, persist]);

  // ── Listen for changes from other tabs ────────────────────────────────
  useEffect(() => {
    function onChanged(changes: Record<string, chrome.storage.StorageChange>, area: string) {
      if (area === "local" && STORAGE_KEY in changes) {
        const updated = changes[STORAGE_KEY].newValue as AccordionGroup[];
        groupsRef.current = updated;
        setGroups(updated);
      }
    }
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  // ── Operations ────────────────────────────────────────────────────────
  // All operations read only groupsRef.current (stable ref) and call persist
  // (stable callback), so they can all have [] deps and be stable themselves.

  const addItem = useCallback(
    async (groupId: string, url: string, title: string) => {
      const next = groupsRef.current.map((g) =>
        g.id !== groupId ? g : { ...g, items: [...g.items, makeSlot(url, title)] },
      );
      await persist(next);
    },
    [persist],
  );

  const moveItem = useCallback(
    async (fromGroupId: string, fromIdx: number, toGroupId: string, toIdx: number) => {
      if (fromGroupId === toGroupId && fromIdx === toIdx) return;

      const next = groupsRef.current.map((g) => ({ ...g, items: [...g.items] }));
      const fromGroup = next.find((g) => g.id === fromGroupId);
      const toGroup = next.find((g) => g.id === toGroupId);
      if (!fromGroup || !toGroup) return;

      if (fromGroupId === toGroupId) {
        // Within group: swap
        const items = fromGroup.items;
        if (toIdx >= items.length) return; // dropping on add-card within same group: no-op
        [items[fromIdx], items[toIdx]] = [items[toIdx], items[fromIdx]];
      } else {
        // Cross-group: extract then insert
        const [item] = fromGroup.items.splice(fromIdx, 1);
        toGroup.items.splice(Math.min(toIdx, toGroup.items.length), 0, item);
      }

      await persist(next);
    },
    [persist],
  );

  const renameGroup = useCallback(
    async (groupId: string, name: string) => {
      const next = groupsRef.current.map((g) =>
        g.id !== groupId ? g : { ...g, name: name.trim() || "New" },
      );
      await persist(next);
    },
    [persist],
  );

  const toggleCollapse = useCallback(
    async (groupId: string) => {
      const next = groupsRef.current.map((g) =>
        g.id !== groupId ? g : { ...g, collapsed: !g.collapsed },
      );
      await persist(next);
    },
    [persist],
  );

  const swapGroups = useCallback(
    async (idxA: number, idxB: number) => {
      if (idxA === idxB) return;
      const next = [...groupsRef.current];
      [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
      await persist(next);
    },
    [persist],
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      const next = groupsRef.current.filter((g) => g.id !== groupId);
      await persist(next);
    },
    [persist],
  );

  return { groups, addItem, moveItem, renameGroup, toggleCollapse, swapGroups, deleteGroup };
}
