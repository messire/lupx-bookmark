// One bookmark in a group.
export interface SpeedDialSlot {
  id: string;
  url: string | null;
  title: string | null;
}

// A named accordion group containing an ordered list of bookmarks.
export interface AccordionGroup {
  id: string;
  name: string;
  collapsed: boolean;
  items: SpeedDialSlot[];
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
  color: string; // hex color for "color" type
  gradient: {
    from: string; // hex color
    to: string; // hex color
    angle: number; // degrees 0–360
  };
  imageUrl: string; // URL for "image" type via external link
  // File upload data is stored separately in chrome.storage.local under "backgroundImage"
}

export type CardStyle =
  | "minimal"
  | "glass"
  | "bento"
  | "icons"
  | "neon"
  | "neumorphic"
  | "stamp"
  | "aurora";

export type SearchEngine = "google" | "yandex" | "duckduckgo";

/** Hard-coded maximum bookmarks per accordion group. */
export const MAX_ITEMS_PER_ACCORDION = 16;

/** Bump this when the Settings schema changes in a breaking way. */
export const SETTINGS_VERSION = 1;

// User-facing settings stored in chrome.storage.local
export interface Settings {
  itemsPerRow: number; // bookmark cards per row (default: 5)
  showTitles: boolean; // show titles below cards (default: true)
  theme: "light" | "dark" | "system";
  background: Background;
  cardStyle: CardStyle;
  searchEngine: SearchEngine;
}

export const DEFAULT_BACKGROUND: Background = {
  type: "none",
  color: "#1a1a2e",
  gradient: { from: "#1a1a2e", to: "#16213e", angle: 135 },
  imageUrl: "",
};

export const DEFAULT_SETTINGS: Settings = {
  itemsPerRow: 5,
  showTitles: true,
  theme: "system",
  background: DEFAULT_BACKGROUND,
  cardStyle: "minimal",
  searchEngine: "google",
};
