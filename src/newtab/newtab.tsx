import { StrictMode, useState, useEffect, useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { useAccordions } from "./useAccordions";
import { useSettings } from "./useSettings";
import { useBackground } from "./useBackground";
import { useFaviconCache } from "./useFaviconCache";
import { FaviconCacheContext } from "./FaviconCacheContext";
import ErrorBoundary from "../components/ErrorBoundary/ErrorBoundary";
import AccordionGroup from "../components/AccordionGroup/AccordionGroup";
import AddSlotModal from "../components/AddSlotModal/AddSlotModal";
import SettingsPanel from "../components/SettingsPanel/SettingsPanel";
import SearchBar from "../components/SearchBar/SearchBar";
import type { SearchEngine } from "../types";
import styles from "./newtab.module.css";

// -- Card size --

const PAGE_PADDING_PCT = 0.2;
const ACCORDION_BORDER = 3;
const CONTENT_PAD_X = 24;
const CARD_GAP = 10;

function calcCardWidth(itemsPerRow: number): number {
  const pagePadding = window.innerWidth * PAGE_PADDING_PCT;
  const available =
    window.innerWidth -
    2 * pagePadding -
    ACCORDION_BORDER -
    CONTENT_PAD_X -
    (itemsPerRow - 1) * CARD_GAP;
  return Math.max(60, Math.floor(available / itemsPerRow));
}

function useCardWidth(itemsPerRow: number): number {
  const [w, setW] = useState(() => calcCardWidth(itemsPerRow));
  useEffect(() => {
    function update() {
      setW(calcCardWidth(itemsPerRow));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [itemsPerRow]);
  return w;
}

// -- Drag state types --

interface ItemDrag {
  groupId: string;
  itemIdx: number;
}

// -- App --

function App() {
  const { settings, updateSettings } = useSettings();
  const {
    groups,
    addGroup,
    moveItem,
    swapGroups,
    deleteGroup,
    addItem,
    removeItem,
    renameItem,
    renameGroup,
    toggleCollapse,
    setIconSize,
  } = useAccordions();
  const cardWidth = useCardWidth(settings.itemsPerRow);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [itemDragFrom, setItemDragFrom] = useState<ItemDrag | null>(null);
  const [itemDragOver, setItemDragOver] = useState<ItemDrag | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") root.setAttribute("data-theme", "dark");
    else if (settings.theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
  }, [settings.theme]);

  useBackground(settings.background);

  // -- Favicon cache --

  const allBookmarkUrls = useMemo(
    () => groups.flatMap((g) => g.items.flatMap((i) => (i.url ? [i.url] : []))),
    [groups],
  );
  const { getFavicon, refreshFavicon } = useFaviconCache(allBookmarkUrls);

  // -- Drag handlers --

  const handleItemDragStart = useCallback((groupId: string, itemIdx: number) => {
    setItemDragFrom({ groupId, itemIdx });
  }, []);

  const handleItemDragOver = useCallback((groupId: string, itemIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    setItemDragOver({ groupId, itemIdx });
  }, []);

  const handleItemDrop = useCallback(
    async (groupId: string, itemIdx: number) => {
      if (!itemDragFrom) return;
      await moveItem(itemDragFrom.groupId, itemDragFrom.itemIdx, groupId, itemIdx);
      setItemDragFrom(null);
      setItemDragOver(null);
    },
    [itemDragFrom, moveItem],
  );

  const handleDragEnd = useCallback(() => {
    setItemDragFrom(null);
    setItemDragOver(null);
  }, []);

  // -- Group reordering (settings panel) --

  const handleSwapGroups = useCallback(
    async (idxA: number, idxB: number) => {
      await swapGroups(idxA, idxB);
    },
    [swapGroups],
  );

  // -- Modal --

  const handleConfirm = useCallback(
    async (url: string, title: string) => {
      if (addingToGroup) {
        await addItem(addingToGroup, url, title);
      }
      setAddingToGroup(null);
    },
    [addingToGroup, addItem],
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      await deleteGroup(groupId);
    },
    [deleteGroup],
  );

  // -- Add group --

  const handleAddGroup = useCallback(async () => {
    await addGroup();
  }, [addGroup]);

  // -- Remove item --

  const handleRemoveItem = useCallback(
    async (groupId: string, itemIdx: number) => {
      await removeItem(groupId, itemIdx);
    },
    [removeItem],
  );

  // -- Rename item --

  const handleRenameItem = useCallback(
    async (groupId: string, itemIdx: number, title: string) => {
      await renameItem(groupId, itemIdx, title);
    },
    [renameItem],
  );

  // -- Search engine --

  const handleEngineChange = useCallback(
    (engine: SearchEngine) => {
      updateSettings({ searchEngine: engine });
    },
    [updateSettings],
  );

  // -- Render --

  return (
    <FaviconCacheContext.Provider value={{ getFavicon, refreshFavicon }}>
      <div className={styles.page} onDragEnd={handleDragEnd}>
        <div className={styles.searchBarRow}>
          <SearchBar
            engine={settings.searchEngine}
            onEngineChange={handleEngineChange}
            cardStyle={settings.cardStyle}
          />
        </div>

        {groups.map((group) => (
          <AccordionGroup
            key={group.id}
            group={group}
            itemsPerRow={settings.itemsPerRow}
            cardWidth={cardWidth}
            showTitles={settings.showTitles}
            cardStyle={settings.cardStyle}
            onItemDragStart={handleItemDragStart}
            onItemDragOver={handleItemDragOver}
            onItemDrop={handleItemDrop}
            itemDragOverInfo={itemDragOver}
            onClickAdd={setAddingToGroup}
            onRename={renameGroup}
            onToggleCollapse={toggleCollapse}
            onRemoveItem={handleRemoveItem}
            onRenameItem={handleRenameItem}
          />
        ))}

        <button
          className={styles.settingsBtn}
          onClick={() => setSettingsOpen(true)}
          title="Settings"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <SettingsPanel
          open={settingsOpen}
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setSettingsOpen(false)}
          groups={groups.map((g) => ({ id: g.id, name: g.name, miniIconSize: g.miniIconSize }))}
          onAddGroup={handleAddGroup}
          onDeleteGroup={handleDeleteGroup}
          onSwapGroups={handleSwapGroups}
          onChangeIconSize={setIconSize}
        />

        {addingToGroup !== null && (
          <AddSlotModal onConfirm={handleConfirm} onClose={() => setAddingToGroup(null)} />
        )}
      </div>
    </FaviconCacheContext.Provider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root element not found");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
