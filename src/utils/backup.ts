import type { AccordionGroup, Settings, SpeedDialSlot } from "../types";
import { DEFAULT_MINI_ICON_SIZE, DEFAULT_SETTINGS } from "../types";

const BACKUP_VERSION = 1;

export interface ParsedBackup {
  settings: Settings;
  groups: AccordionGroup[];
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ── Export ────────────────────────────────────────────────────────────────

/**
 * Serializes settings + bookmark groups and triggers a browser download of
 * the resulting JSON file. No chrome.* APIs involved — plain Blob/anchor.
 */
export function downloadBackup(settings: Settings, groups: AccordionGroup[]): void {
  const payload = {
    __version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    groups,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date();
  const filename = `lupx-bookmark-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Import / parsing ─────────────────────────────────────────────────────

function normalizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object") {
    throw new Error("Backup file is missing settings.");
  }
  return { ...DEFAULT_SETTINGS, ...(raw as Partial<Settings>) };
}

function normalizeSlot(raw: unknown): SpeedDialSlot {
  if (!raw || typeof raw !== "object") {
    throw new Error("Backup file contains an invalid bookmark item.");
  }
  const slot = raw as Partial<SpeedDialSlot>;
  return {
    id: typeof slot.id === "string" && slot.id ? slot.id : uid(),
    url: typeof slot.url === "string" ? slot.url : null,
    title: typeof slot.title === "string" ? slot.title : null,
  };
}

function normalizeGroups(raw: unknown): AccordionGroup[] {
  if (!Array.isArray(raw)) {
    throw new Error("Backup file is missing a valid bookmark list.");
  }
  return raw.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Backup file contains an invalid group.");
    }
    const group = entry as Partial<AccordionGroup>;
    if (typeof group.name !== "string" || !Array.isArray(group.items)) {
      throw new Error("Backup file contains an invalid group.");
    }
    return {
      id: typeof group.id === "string" && group.id ? group.id : uid(),
      name: group.name,
      collapsed: Boolean(group.collapsed),
      miniIconSize:
        typeof group.miniIconSize === "number" ? group.miniIconSize : DEFAULT_MINI_ICON_SIZE,
      items: group.items.map(normalizeSlot),
    };
  });
}

/** Reads and validates a backup file, filling in defaults for missing fields. */
export async function parseBackupFile(file: File): Promise<ParsedBackup> {
  const text = await file.text();

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("This file isn't a valid lupx-bookmark backup.");
  }
  const data = raw as Record<string, unknown>;

  return {
    settings: normalizeSettings(data.settings),
    groups: normalizeGroups(data.groups),
  };
}

// ── Merge strategies ──────────────────────────────────────────────────────

/** Overlays incoming settings on top of current, deep-merging the background block. */
export function mergeSettings(current: Settings, incoming: Settings): Settings {
  return {
    ...current,
    ...incoming,
    background: {
      ...current.background,
      ...incoming.background,
      gradient: { ...current.background.gradient, ...incoming.background.gradient },
    },
  };
}

/**
 * Combines incoming groups into the current list: groups whose name matches
 * an existing one (case-insensitive) have their items appended (skipping
 * duplicate URLs); unmatched groups are added as new groups. IDs on newly
 * introduced groups/items are regenerated to avoid collisions.
 */
export function mergeGroups(
  current: AccordionGroup[],
  incoming: AccordionGroup[],
): AccordionGroup[] {
  const result = current.map((g) => ({ ...g, items: [...g.items] }));

  for (const incomingGroup of incoming) {
    const existing = result.find(
      (g) => g.name.trim().toLowerCase() === incomingGroup.name.trim().toLowerCase(),
    );

    if (existing) {
      const existingUrls = new Set(existing.items.flatMap((i) => (i.url ? [i.url] : [])));
      const newItems = incomingGroup.items
        .filter((i) => !i.url || !existingUrls.has(i.url))
        .map((i) => ({ ...i, id: uid() }));
      existing.items.push(...newItems);
    } else {
      result.push({
        ...incomingGroup,
        id: uid(),
        items: incomingGroup.items.map((i) => ({ ...i, id: uid() })),
      });
    }
  }

  return result;
}
