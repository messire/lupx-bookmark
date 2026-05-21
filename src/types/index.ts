// One cell in the speed dial grid.
// Empty slot: url and title are null.
// Filled slot: both url and title are set.
export interface SpeedDialSlot {
  id: string;
  url: string | null;
  title: string | null;
}

// A history suggestion shown while the user types in AddSlotModal
export interface HistorySuggestion {
  url: string;
  title: string;
  visitCount: number;
}

// User-facing settings stored in chrome.storage.sync
export interface Settings {
  columns: number;       // columns in the grid (default: 4)
  showTitles: boolean;   // show titles below cards (default: true)
  theme: "light" | "dark" | "system";
}

export const DEFAULT_SETTINGS: Settings = {
  columns: 4,
  showTitles: true,
  theme: "system",
};

// How many slots to show in the grid by default
export const DEFAULT_SLOT_COUNT = 8;
