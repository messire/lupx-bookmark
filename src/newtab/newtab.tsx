import { StrictMode, useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { useAccordions } from "./useAccordions";
import { useSettings } from "./useSettings";
import { useBackground } from "./useBackground";
import AccordionGroup from "../components/AccordionGroup/AccordionGroup";
import AddSlotModal from "../components/AddSlotModal/AddSlotModal";
import SettingsPanel from "../components/SettingsPanel/SettingsPanel";
import SearchBar from "../components/SearchBar/SearchBar";
import type { SearchEngine } from "../types";
import styles from "./newtab.module.css";

// ── Card size ─────────────────────────────────────────────────────────────

const PAGE_PADDING_PCT = 0.10; // must match .page { padding: 24px 10% }
const ACCORDION_BORDER = 3;    // accordion border (1.5 * 2)
const CONTENT_PAD_X = 24;      // accordion .content left+right padding (12*2)
const CARD_GAP = 10;           // gap between cards

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
    function update() { setW(calcCardWidth(itemsPerRow)); }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [itemsPerRow]);
  return w;
}

// ── Drag state types ──────────────────────────────────────────────────────

interface ItemDrag {
  groupId: string;
  itemIdx: number;
}

// ── App ───────────────────────────────────────────────────────────────────

function App() {
  const { settings, updateSettings } = useSettings();
  const {
    groups,
    moveItem,
    swapGroups,
    deleteGroup,
    addItem,
    renameGroup,
    toggleCollapse,
  } = useAccordions(settings.accordionCount);
  const cardWidth = useCardWidth(settings.itemsPerRow);

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // AddSlotModal — tracks which group the add was triggered for
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);

  // Item drag state
  const [itemDragFrom, setItemDragFrom] = useState<ItemDrag | null>(null);
  const [itemDragOver, setItemDragOver] = useState<ItemDrag | null>(null);

  // Group drag state
  const [groupDragFrom, setGroupDragFrom] = useState<number | null>(null);
  const [groupDragOver, setGroupDragOver] = useState<number | null>(null);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") root.setAttribute("data-theme", "dark");
    else if (settings.theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
  }, [settings.theme]);

  useBackground(settings.background);

  // ── Drag handlers ───────────────────────────────────────────────────────

  const handleItemDragStart = useCallback((groupId: string, itemIdx: number) => {
    setItemDragFrom({ groupId, itemIdx });
  }, []);

  const handleItemDragOver = useCallback(
    (groupId: string, itemIdx: number, e: React.DragEvent) => {
      e.preventDefault();
      setItemDragOver({ groupId, itemIdx });
    },
    [],
  );

  const handleItemDrop = useCallback(
    async (groupId: string, itemIdx: number) => {
      if (!itemDragFrom) return;
      await moveItem(
        itemDragFrom.groupId,
        itemDragFrom.itemIdx,
        groupId,
        itemIdx,
      );
      setItemDragFrom(null);
      setItemDragOver(null);
    },
    [itemDragFrom, moveItem],
  );

  const handleGroupDragStart = useCallback((groupIdx: number) => {
    setGroupDragFrom(groupIdx);
  }, []);

  const handleGroupDragOver = useCallback(
    (groupIdx: number, e: React.DragEvent) => {
      e.preventDefault();
      setGroupDragOver(groupIdx);
    },
    [],
  );

  const handleGroupDrop = useCallback(
    async (groupIdx: number) => {
      if (groupDragFrom !== null && groupDragFrom !== groupIdx) {
        await swapGroups(groupDragFrom, groupIdx);
      }
      setGroupDragFrom(null);
      setGroupDragOver(null);
    },
    [groupDragFrom, swapGroups],
  );

  function handleDragEnd() {
    setItemDragFrom(null);
    setItemDragOver(null);
    setGroupDragFrom(null);
    setGroupDragOver(null);
  }

  // ── Modal ───────────────────────────────────────────────────────────────

  async function handleConfirm(url: string, title: string) {
    if (addingToGroup) {
      await addItem(addingToGroup, url, title);
    }
    setAddingToGroup(null);
  }

  // Deleting via the × button also decrements the settings counter
  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      await deleteGroup(groupId);
      await updateSettings({ accordionCount: Math.max(1, settings.accordionCount - 1) });
    },
    [deleteGroup, updateSettings, settings.accordionCount],
  );

  // ── Search engine ────────────────────────────────────────────────────────

  function handleEngineChange(engine: SearchEngine) {
    updateSettings({ searchEngine: engine });
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={styles.page} onDragEnd={handleDragEnd}>
      <div className={styles.searchBarRow}>
        <SearchBar
          engine={settings.searchEngine}
          onEngineChange={handleEngineChange}
        />
      </div>

      {groups.map((group, idx) => (
        <AccordionGroup
          key={group.id}
          group={group}
          groupIndex={idx}
          itemsPerRow={settings.itemsPerRow}
          cardWidth={cardWidth}
          showTitles={settings.showTitles}
          cardStyle={settings.cardStyle}
          onItemDragStart={handleItemDragStart}
          onItemDragOver={handleItemDragOver}
          onItemDrop={handleItemDrop}
          onDragEnd={handleDragEnd}
          itemDragOverInfo={itemDragOver}
          onGroupDragStart={handleGroupDragStart}
          onGroupDragOver={handleGroupDragOver}
          onGroupDrop={handleGroupDrop}
          isGroupDragOver={groupDragOver === idx}
          onClickAdd={setAddingToGroup}
          onRename={renameGroup}
          onToggleCollapse={toggleCollapse}
          onDelete={handleDeleteGroup}
          settingsOpen={settingsOpen}
        />
      ))}

      {/* Settings button */}
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
      />

      {addingToGroup !== null && (
        <AddSlotModal
          onConfirm={handleConfirm}
          onClose={() => setAddingToGroup(null)}
        />
      )}
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
