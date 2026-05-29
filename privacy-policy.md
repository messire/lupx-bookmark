# Privacy Policy — LUPX Bookmark

_Last updated: May 29, 2026_

## Overview

LUPX Bookmark is a Chrome extension that replaces the New Tab page with a visual bookmark grid. This policy explains what data the extension accesses and how it is handled.

## Data We Do Not Collect

LUPX Bookmark does **not** collect, transmit, or share any user data with the developer or any third party. No analytics, no tracking, no external servers.

## Permissions and How They Are Used

### `storage`

Used to save your settings (card style, background, theme, layout preferences) and a favicon cache locally on your device via `chrome.storage.local`. This data never leaves your device.

### `history`

Used exclusively to suggest matching URLs from your browsing history when you type in the Add Bookmark dialog. History data is read in real time, displayed as suggestions, and immediately discarded. It is never stored, logged, or transmitted anywhere.

### `favicon`

Used to load favicons from Chrome's internal icon cache (`chrome://favicon2/`) for bookmarks displayed in the grid. No favicon data is stored beyond the local cache described above.

## Third-Party Services

When a favicon cannot be resolved from Chrome's internal cache, the extension may attempt to load it from:

- **DuckDuckGo** icon service (`icons.duckduckgo.com`) — only the domain name of the bookmarked site is sent as part of the image request URL.
- **Google S2** favicon service (`www.google.com/s2/favicons`) — only the domain name of the bookmarked site is sent.

These are standard image requests (no cookies, no user identifiers). The extension has no control over how these services handle requests — refer to their respective privacy policies for details.

## Data Storage

All data stored by the extension (settings, favicon cache) resides locally in your browser's storage. It is never uploaded or synced to any external server by this extension.

## Changes to This Policy

If the extension is updated in a way that changes how data is handled, this policy will be updated accordingly.

## Contact

If you have questions about this policy, please open an issue in the extension's GitHub repository.
