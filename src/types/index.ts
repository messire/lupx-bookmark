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

// Background configuration
export type BackgroundType = "none" | "color" | "gradient" | "image";

export interface Background {
  type: BackgroundType;
  color: string;           // hex color for "color" type
  gradient: {
    from: string;          // hex color
    to: string;            // hex color
    angle: number;         // degrees 0–360
  };
  imageUrl: string;        // URL for "image" type via external link
  // File upload data is stored separately in chrome.storage.local under "backgroundImage"
}

export type CardStyle = "minimal" | "glass" | "bento" | "icons";

// User-facing settings stored in chrome.storage.sync
export interface Settings {
  columns: number;         // columns in the grid (default: 4)
  rows: number;            // rows in the grid (default: 2); total slots = columns × rows
  showTitles: boolean;     // show titles below cards (default: true)
  theme: "light" | "dark" | "system";
  background: Background;
  cardStyle: CardStyle;
}

export const DEFAULT_BACKGROUND: Background = {
  type: "none",
  color: "#1a1a2e",
  gradient: { from: "#1a1a2e", to: "#16213e", angle: 135 },
  imageUrl: "",
};

export const DEFAULT_SETTINGS: Settings = {
  columns: 4,
  rows: 2,
  showTitles: true,
  theme: "system",
  background: DEFAULT_BACKGROUND,
  cardStyle: "minimal",
};

// Total slot capacity — indices 0..MAX_SLOTS-1 are always stored
// Max grid is 8×8 = 64 slots
export const MAX_SLOTS = 64;
