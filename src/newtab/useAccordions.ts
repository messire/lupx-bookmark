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
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: groups });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[lupx] Failed to save bookmarks:", message);
    throw err;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UseAccordionsResult {
  groups: AccordionGroup[];
  /** Add a new empty group at the end of the list. */
  addGroup: () => Promise<void>;
  /** Add a bookmark to a group. */
  addItem: (groupId: string, url: string, title: string) => Promise<void>;
  /**
   * Move a bookmark.
   * Same group: swap positions.
   * Different groups: remove from source, insert at toIdx in target.
   */
  moveItem: (
    fromGroupId: string,
    fromIdx: number,
    toGroupId: string,
    toIdx: number,
  ) => Promise<void>;
  /** Remove a single bookmark from a group by index. */
  removeItem: (groupId: string, itemIdx: number) => Promise<void>;
  /** Rename a bookmark (update its title) by index. */
  renameItem: (groupId: string, itemIdx: number, title: string) => Promise<void>;
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
 *
 * Group count is owned entirely by this hook. Adding/removing groups happens
 * through explicit user actions only — no automatic truncation.
 */
export function useAccordions(): UseAccordionsResult {
  const [groups, setGroups] = useState<AccordionGroup[]>([]);
  const groupsRef = useRef<AccordionGroup[]>([]);

  // ── Persist helper ────────────────────────────────────────────────────
  const persist = useCallback(async (next: AccordionGroup[]) => {
    const prev = groupsRef.current;
    groupsRef.current = next;
    setGroups(next);
    try {
      await saveToStorage(next);
    } catch {
      groupsRef.current = prev;
      setGroups(prev);
    }
  }, []);

  // ── Initial load + migration ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let loaded = await loadFromStorage();

      if (!loaded) {
        const legacy = await loadLegacy();
        if (legacy?.some((s) => s.url)) {
          const first = makeGroup("Bookmarks");
          first.items = legacy.flatMap((s) => {
            if (!s.url) return [];
            return [makeSlot(s.url, s.title ?? s.url)];
          });
          loaded = [first];
        } else {
          loaded = [makeGroup("Work"), makeGroup("Personal"), makeGroup("Tools")];
        }
      }

      if (cancelled) return;
      await persist(loaded);
    })();

    return () => {
      cancelled = true;
    };
  }, [persist]);

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

  const addGroup = useCallback(async () => {
    const next = [...groupsRef.current, makeGroup("New")];
    await persist(next);
  }, [persist]);

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
        const items = fromGroup.items;
        if (toIdx >= items.length) return;
        [items[fromIdx], items[toIdx]] = [items[toIdx], items[fromIdx]];
      } else {
        const [item] = fromGroup.items.splice(fromIdx, 1);
        toGroup.items.splice(Math.min(toIdx, toGroup.items.length), 0, item);
      }

      await persist(next);
    },
    [persist],
  );

  const removeItem = useCallback(
    async (groupId: string, itemIdx: number) => {
      const next = groupsRef.current.map((g) => {
        if (g.id !== groupId) return g;
        const items = [...g.items];
        items.splice(itemIdx, 1);
        return { ...g, items };
      });
      await persist(next);
    },
    [persist],
  );

  const renameItem = useCallback(
    async (groupId: string, itemIdx: number, title: string) => {
      const next = groupsRef.current.map((g) => {
        if (g.id !== groupId) return g;
        const items = g.items.map((item, idx) =>
          idx === itemIdx ? { ...item, title: title.trim() || item.url } : item,
        );
        return { ...g, items };
      });
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

  return {
    groups,
    addGroup,
    addItem,
    moveItem,
    removeItem,
    renameItem,
    renameGroup,
    toggleCollapse,
    swapGroups,
    deleteGroup,
  };
}
