# LUPX Bookmark

> A visual bookmark Speed Dial that replaces the Chrome New Tab page.

[![Available in the Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-available-brightgreen?logo=google-chrome)](https://chromewebstore.google.com/detail/bimppdedfmedfgpceankflnegkdpgkep?utm_source=item-share-cb)

Instead of the default blank tab, LUPX Bookmark greets you with a clean grid of bookmark cards — each showing a favicon and a title — organized into collapsible, drag-and-drop groups. Everything is
stored locally in your browser; no account, no server, no tracking.

---

## Why

The built-in Chrome bookmark bar is linear and hard to scan at a glance. Third-party Speed Dial extensions are either bloated, require sign-in, or inject ads. LUPX Bookmark is intentionally minimal: a
single-purpose extension that does exactly one thing and stays out of your way.

---

## Features

- **Bookmark grid** — cards with favicons in configurable columns (2–10 per row)
- **Accordion groups** — unlimited named groups (minimum 1), individually collapsible, each with an adjustable mini-icon size (12–32 px) shown when collapsed; groups themselves are arranged in 1–4 columns (configurable in Settings)
- **Drag & drop** — reorder cards within a group or move cards between groups by dragging (always active); group order itself is changed via up/down buttons in the Settings panel, not drag-and-drop
- **Edit bookmarks** — click a card's edit action to open a modal and change its title or URL in place
- **9 card styles** — Minimal · Glass · Bento · Icons · Neon Pink · Neon Cyan · Soft UI · Stamp · Aurora
- **Custom background** — solid color, linear gradient, image URL, or local file upload; built-in wallpaper gallery; text color adapts automatically based on background luminance
- **Search bar** — Google, Yandex, or DuckDuckGo (choice persisted); search on Enter or button click; an empty query navigates to the selected engine's home page instead of searching
- **Theme** — Light / Dark / System (follows OS preference)
- **History autocomplete** — Add-bookmark modal suggests pages from your browsing history as you type
- **Favicon caching** — resolved favicons (`chrome://favicon2/` → Google S2 → pin placeholder) are persisted to `chrome.storage.local` so cards render instantly on repeat visits
- **Cross-tab sync** — changes made in one tab are immediately reflected in all other open New Tab pages via `chrome.storage.onChanged`
- **Resizable settings panel** — drag the panel edge to resize (240–640 px); width is remembered via `localStorage`
- **Rollback** — Settings panel snapshots your config on open and offers a one-click rollback if you change your mind
- **Import / Export** — back up settings and bookmark groups to a JSON file, or restore from one; importing lets you choose to merge with your current data or replace it entirely
- **Error boundary** — a top-level React error boundary shows a recovery UI instead of a blank tab if rendering fails

---

## Tech Stack

| Layer           | Technology                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Language        | TypeScript 5 (strict mode)                                                                                         |
| UI framework    | React 18                                                                                                           |
| Bundler         | Vite 8 + `vite-plugin-web-extension`                                                                               |
| Styling         | CSS Modules                                                                                                        |
| Chrome APIs     | `chrome.storage.local` · `chrome.storage.onChanged` · `chrome.history` · `chrome://favicon2/` (favicon permission) |
| Testing         | Vitest + React Testing Library + jsdom                                                                             |
| Lint / format   | ESLint (typescript-eslint) + Prettier, enforced via Husky + lint-staged pre-commit hook                            |
| Manifest        | Version 3 (MV3)                                                                                                    |
| Package manager | npm                                                                                                                |

No runtime dependencies beyond React. No Redux, no router, no UI library. Permissions declared in `manifest.json`: `history`, `storage`, `favicon` — note there is no `bookmarks` permission; bookmark
cards are custom "slots" persisted in `chrome.storage.local`, not real Chrome bookmarks.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Google Chrome (or any Chromium-based browser)

### Install dependencies

```bash
npm install
```

### Development build (watch mode)

```bash
npm run dev
```

Vite rebuilds into `dist/` on every file save.

### Production build

```bash
npm run build
```

### Type check

```bash
npm run typecheck
```

### Lint & format

```bash
npm run lint        # eslint src
npm run lint:fix     # eslint src --fix
npm run format:check # prettier --check .
npm run format       # prettier --write .
```

### Tests

```bash
npm test        # vitest run
npm run test:watch
```

A Husky pre-commit hook runs `lint-staged` (Prettier + ESLint) on changed files. CI (`.github/workflows/ci.yml`) runs typecheck, lint, test, format check, and build on every push/PR.

---

## Loading the Extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder generated by the build
5. Open a new tab — LUPX Bookmark replaces the default page

To apply code changes during development: after each save the `dist/` folder is updated automatically; click the **↺ refresh** icon on the extension card in `chrome://extensions` to reload.

---

## Project Structure

```
lupx-bookmark/
├── public/
│   └── icons/
│       ├── lupx_logo.png     # Extension icon (16 / 48 / 128 px)
│       └── pin.svg           # Fallback favicon placeholder
├── src/
│   ├── newtab/
│   │   ├── newtab.html            # New Tab page entry point
│   │   ├── newtab.tsx             # React root — layout, drag state, event wiring
│   │   ├── newtab.module.css
│   │   ├── useAccordions.ts       # Accordion groups CRUD + chrome.storage.local
│   │   ├── useSettings.ts         # User settings + chrome.storage.local
│   │   ├── useBackground.ts       # Background rendering + file upload to storage.local
│   │   ├── useWallpapers.ts       # Built-in wallpaper gallery loader
│   │   ├── useFaviconCache.ts     # Persistent favicon cache in chrome.storage.local
│   │   └── FaviconCacheContext.ts # React context exposing the resolved favicon cache
│   ├── components/
│   │   ├── AccordionGroup/   # Collapsible group with drag handles
│   │   ├── BookmarkCard/     # Individual bookmark card (all 9 style variants)
│   │   ├── AddSlotModal/     # Add-bookmark dialog with history suggestions
│   │   ├── EditItemModal/    # Edit an existing bookmark's title/URL
│   │   ├── SearchBar/        # Search bar with engine picker
│   │   ├── SettingsPanel/    # Slide-in settings drawer (Style / Items / Backup tabs, rollback)
│   │   └── ErrorBoundary/    # Top-level render-error recovery UI
│   ├── types/
│   │   └── index.ts          # Shared TypeScript types and constants
│   ├── utils/
│   │   ├── favicon.ts        # favicon resolution: chrome://favicon2/ → Google S2 → pin.svg
│   │   └── backup.ts         # Backup export/import: file I/O, validation, merge strategies
│   └── test/
│       └── setup.ts          # Vitest + jsdom test setup
├── manifest.json
├── vite.config.ts
├── vitest.config.ts
└── tsconfig.json
```

Each hook and component has a co-located `*.test.ts(x)` file (omitted above for brevity).

---

## Architecture Notes

All logic runs inside the New Tab page. There is no background service worker.

- **Settings** (`chrome.storage.local`, key `"settings_v1"`) — layout prefs, theme, card style, search engine, background config. Writes are debounced (300 ms) and versioned (`SETTINGS_VERSION`) so
  schema changes fall back to defaults instead of crashing on old data.
- **Accordion data** (`chrome.storage.local`, key `"accordionGroups"`) — bookmark groups and items. On first load, data is migrated once from the legacy flat-grid key (`"speedDial"`, previously in
  `chrome.storage.sync`).
- **Favicon cache** (`chrome.storage.local`, key `"faviconCache_v1"`) — resolved favicon URLs are cached per bookmark URL so repeat visits skip the resolution chain.
- **Background image** (`chrome.storage.local`, key `"backgroundImage"`) — stored as a base-64 data-URL to survive browser restarts without requiring a host permission.
- **Cross-tab sync** — `useSettings`, `useAccordions`, and `useBackground` each scope a `chrome.storage.onChanged` listener to their own storage key, so unrelated writes never bleed into unrelated
  state.
- **Drag & drop** — item drag state is lifted to `newtab.tsx` so cross-group drops work without prop-drilling callbacks through multiple levels. Group _order_, by contrast, is not drag-based — it's changed via up/down buttons in `SettingsPanel` that call `swapGroups`.
- **Group columns** — `settings.groupColumns` (1–4, default 1) controls how many columns accordion groups are arranged into on the New Tab page; adjustable from the Settings panel's Items tab.
- **Edit bookmarks** (`EditItemModal`) — `BookmarkCard` renders an edit action that opens the modal; `onEditItem` is threaded through `AccordionGroup` up to `newtab.tsx`, which persists the change via `useAccordions`.
- **Settings panel width** — kept in `localStorage` (not `chrome.storage`), since it's a local UI preference that doesn't need cross-tab sync or backup.
- **Card styles** — implemented as CSS Module class variants on `BookmarkCard` and `AccordionGroup`; the active style is passed as a prop from settings, never read from DOM.
- **No `chrome.bookmarks` API** — despite the name, bookmark cards are app-managed "slots," not entries in the browser's native bookmark tree.
- **Backup import/export** (`src/utils/backup.ts`) — export serializes current settings + accordion groups to a downloaded JSON file (plain `Blob`/anchor, no `chrome.*` APIs). Import parses and validates
  the file, then asks the user to **merge** (append imported groups to matching-name groups, skip duplicate URLs, deep-merge settings) or **replace** (overwrite settings and groups outright).

---

## License

MIT — see [LICENSE](./LICENSE).
