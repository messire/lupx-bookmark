/**
 * Global test setup — executed before every test file by Vitest.
 *
 * Provides a realistic in-memory Chrome storage mock and a helper for
 * simulating cross-tab storage changes (chrome.storage.onChanged).
 */
import { vi, beforeEach } from "vitest";

// ── Types ─────────────────────────────────────────────────────────────────

type StorageChange = { oldValue?: unknown; newValue?: unknown };
type ChangeListener = (changes: Record<string, StorageChange>, area: string) => void;
type SyncOnlyListener = (changes: Record<string, StorageChange>) => void;

// ── Shared state (reset before every test) ────────────────────────────────

const stores: { sync: Record<string, unknown>; local: Record<string, unknown> } = {
  sync: {},
  local: {},
};

/** Listeners registered via chrome.storage.onChanged (global — all areas). */
const globalListeners: ChangeListener[] = [];
/** Listeners registered via chrome.storage.sync.onChanged (sync area only). */
const syncListeners: SyncOnlyListener[] = [];

// ── Public helper ─────────────────────────────────────────────────────────

/**
 * Simulate a storage change arriving from another tab.
 * Call this after the hook has mounted so its listeners are registered.
 *
 * @example
 * fireStorageChange("local", { accordionGroups: { newValue: groups } });
 */
export function fireStorageChange(
  area: "sync" | "local",
  changes: Record<string, { oldValue?: unknown; newValue: unknown }>,
): void {
  const c = changes as Record<string, StorageChange>;
  globalListeners.forEach((l) => l(c, area));
  if (area === "sync") {
    syncListeners.forEach((l) => l(c));
  }
}

/**
 * Pre-populate storage without triggering any onChanged listeners.
 * Use this before rendering a hook to set up initial storage state.
 *
 * @example
 * seedStorage("local", { accordionGroups: [group1, group2] });
 */
export function seedStorage(area: "sync" | "local", data: Record<string, unknown>): void {
  Object.assign(stores[area], data);
}

// ── Mock builders (recreated each test) ──────────────────────────────────

function makeGet(area: "sync" | "local") {
  return vi.fn(
    (
      keys: string | string[] | Record<string, unknown>,
      callback: (result: Record<string, unknown>) => void,
    ) => {
      const store = stores[area];
      const result: Record<string, unknown> = {};

      if (typeof keys === "string") {
        if (keys in store) result[keys] = store[keys];
      } else if (Array.isArray(keys)) {
        for (const k of keys) {
          if (k in store) result[k] = store[k];
        }
      } else {
        // Object form: each key has a default value — mirrors Chrome behaviour.
        for (const [k, defaultVal] of Object.entries(keys)) {
          result[k] = k in store ? store[k] : defaultVal;
        }
      }

      callback(result);
    },
  );
}

function makeSet(area: "sync" | "local") {
  return vi.fn((items: Record<string, unknown>, callback?: () => void): Promise<void> => {
    const store = stores[area];
    const changes: Record<string, StorageChange> = {};

    for (const [k, v] of Object.entries(items)) {
      changes[k] = { oldValue: store[k], newValue: v };
      store[k] = v;
    }

    // Mirror Chrome: set() fires onChanged automatically.
    globalListeners.forEach((l) => l(changes, area));
    if (area === "sync") {
      syncListeners.forEach((l) => l(changes));
    }

    callback?.();
    return Promise.resolve();
  });
}

// ── Reset before every test ───────────────────────────────────────────────

beforeEach(() => {
  // Clear stores.
  stores.sync = {};
  stores.local = {};

  // Clear listener arrays (keep the same references so closures still work).
  globalListeners.length = 0;
  syncListeners.length = 0;

  // Rebuild the chrome global with fresh vi.fn() instances.
  globalThis.chrome = {
    storage: {
      sync: {
        get: makeGet("sync"),
        set: makeSet("sync"),
        onChanged: {
          addListener: vi.fn((l: SyncOnlyListener) => syncListeners.push(l)),
          removeListener: vi.fn((l: SyncOnlyListener) => {
            const i = syncListeners.indexOf(l);
            if (i !== -1) syncListeners.splice(i, 1);
          }),
        },
      },
      local: {
        get: makeGet("local"),
        set: makeSet("local"),
      },
      onChanged: {
        addListener: vi.fn((l: ChangeListener) => globalListeners.push(l)),
        removeListener: vi.fn((l: ChangeListener) => {
          const i = globalListeners.indexOf(l);
          if (i !== -1) globalListeners.splice(i, 1);
        }),
      },
    },
    history: {
      search: vi.fn(),
    },
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    },
  } as unknown as typeof chrome;
});
