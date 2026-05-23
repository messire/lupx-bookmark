import { useState, useRef } from "react";
import BookmarkCard from "../BookmarkCard/BookmarkCard";
import { getFaviconUrl, getFaviconDDGUrl, getFaviconFallbackUrl } from "../../utils/favicon";
import type { AccordionGroup as AccordionGroupType, CardStyle, SpeedDialSlot } from "../../types";
import { MAX_ITEMS_PER_ACCORDION } from "../../types";
import styles from "./AccordionGroup.module.css";

/** A slot that is guaranteed to have a URL (used for mini icons in collapsed state). */
type FilledSlot = SpeedDialSlot & { url: string };

const PIN_ICON = chrome.runtime.getURL("icons/pin.svg");

// Empty slot sentinel used for the "add" card
const EMPTY_SLOT: SpeedDialSlot = { id: "__add__", url: null, title: null };

// Maps card style to extra CSS class on the accordion container
const ACCORDION_STYLE_CLASS: Record<CardStyle, string> = {
  minimal: styles.accordionMinimal,
  glass: styles.accordionGlass,
  bento: styles.accordionBento,
  icons: styles.accordionMinimal,
  neon: styles.accordionNeon,
  neumorphic: styles.accordionNeumorphic,
  stamp: styles.accordionMinimal,
  aurora: styles.accordionAurora,
};

interface DragOverInfo {
  groupId: string;
  itemIdx: number;
}

interface AccordionGroupProps {
  group: AccordionGroupType;
  groupIndex: number;
  itemsPerRow: number;
  cardWidth: number;
  showTitles: boolean;
  cardStyle: CardStyle;

  // Item-level drag callbacks (hoisted to newtab.tsx)
  onItemDragStart: (groupId: string, itemIdx: number) => void;
  onItemDragOver: (groupId: string, itemIdx: number, e: React.DragEvent) => void;
  onItemDrop: (groupId: string, itemIdx: number) => void;
  onDragEnd: () => void;
  itemDragOverInfo: DragOverInfo | null;

  // Group-level drag callbacks (for reordering groups)
  onGroupDragStart: (groupIdx: number) => void;
  onGroupDragOver: (groupIdx: number, e: React.DragEvent) => void;
  onGroupDrop: (groupIdx: number) => void;
  isGroupDragOver: boolean;

  // Data callbacks
  onClickAdd: (groupId: string) => void;
  onRename: (groupId: string, name: string) => Promise<void>;
  onToggleCollapse: (groupId: string) => Promise<void>;
  onRemoveItem: (groupId: string, itemIdx: number) => Promise<void>;
  onRenameItem: (groupId: string, itemIdx: number, title: string) => Promise<void>;

  /** When false, drag handles and delete button are hidden */
  settingsOpen: boolean;
}

export default function AccordionGroup({
  group,
  groupIndex,
  itemsPerRow,
  cardWidth,
  showTitles,
  cardStyle,
  onItemDragStart,
  onItemDragOver,
  onItemDrop,
  onDragEnd,
  itemDragOverInfo,
  onGroupDragStart,
  onGroupDragOver,
  onGroupDrop,
  isGroupDragOver,
  onClickAdd,
  onRename,
  onToggleCollapse,
  onRemoveItem,
  onRenameItem,
  settingsOpen,
}: AccordionGroupProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // -- Inline rename --

  function startEdit() {
    setDraft(group.name);
    setEditing(true);
  }

  async function commitEdit() {
    setEditing(false);
    if (draft.trim() !== group.name) {
      await onRename(group.id, draft);
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === "Escape") {
      setDraft(group.name);
      setEditing(false);
    }
  }

  // -- Drag handle for group reordering --

  function handleGroupDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    onGroupDragStart(groupIndex);
  }

  // -- Layout helpers --

  const filledItems = group.items;
  const showAddCard = filledItems.length < MAX_ITEMS_PER_ACCORDION;
  const gridCols = `repeat(${itemsPerRow}, ${cardWidth}px)`;

  const groupClass = [
    styles.accordion,
    ACCORDION_STYLE_CLASS[cardStyle],
    isGroupDragOver ? styles.groupDragOver : "",
  ]
    .filter(Boolean)
    .join(" ");

  // -- Render --

  return (
    <div
      className={groupClass}
      onDragOver={settingsOpen ? (e) => onGroupDragOver(groupIndex, e) : undefined}
      onDrop={settingsOpen ? () => onGroupDrop(groupIndex) : undefined}
    >
      {/* -- Header -- */}
      <div className={styles.header}>
        {/* Drag handle - only visible when Settings panel is open */}
        {settingsOpen && (
          <div
            className={styles.dragHandle}
            draggable
            onDragStart={handleGroupDragStart}
            onDragEnd={onDragEnd}
            title="Drag to reorder"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.2" />
              <circle cx="10" cy="3" r="1.2" />
              <circle cx="4" cy="7" r="1.2" />
              <circle cx="10" cy="7" r="1.2" />
              <circle cx="4" cy="11" r="1.2" />
              <circle cx="10" cy="11" r="1.2" />
            </svg>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          className={styles.toggleBtn}
          onClick={() => onToggleCollapse(group.id)}
          aria-label={group.collapsed ? "Expand" : "Collapse"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={group.collapsed ? styles.iconCollapsed : styles.iconExpanded}
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
        </button>

        {/* Name (editable inline) */}
        {editing ? (
          <input
            ref={inputRef}
            className={styles.nameInput}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleNameKeyDown}
          />
        ) : (
          <span className={styles.name} onDoubleClick={startEdit} title="Double-click to rename">
            {group.name || "new"}
          </span>
        )}

        {/* Mini favicons (shown only when collapsed) */}
        {group.collapsed && (
          <div className={styles.miniIcons}>
            {filledItems
              .filter((i): i is FilledSlot => i.url !== null)
              .map((item) => (
                <MiniIcon key={item.id} item={item} />
              ))}
          </div>
        )}
      </div>

      {/* -- Card grid (expanded only) -- */}
      {!group.collapsed && (
        <div className={styles.content} style={{ gridTemplateColumns: gridCols }}>
          {filledItems.map((item, idx) => (
            <BookmarkCard
              key={item.id}
              slot={item}
              showTitle={showTitles}
              cardStyle={cardStyle}
              onClick={() => {
                /* filled cards are navigated by href */
              }}
              onDragStart={() => onItemDragStart(group.id, idx)}
              onDragOver={(e) => onItemDragOver(group.id, idx, e)}
              onDrop={() => onItemDrop(group.id, idx)}
              isDragOver={
                itemDragOverInfo?.groupId === group.id && itemDragOverInfo?.itemIdx === idx
              }
              onRemove={() => onRemoveItem(group.id, idx)}
              onRename={(title) => onRenameItem(group.id, idx, title)}
            />
          ))}

          {/* Empty "add" card */}
          {showAddCard && (
            <BookmarkCard
              slot={EMPTY_SLOT}
              showTitle={false}
              cardStyle={cardStyle}
              onClick={() => onClickAdd(group.id)}
              onDragStart={() => {
                /* empty card cannot be dragged */
              }}
              onDragOver={(e) => onItemDragOver(group.id, filledItems.length, e)}
              onDrop={() => onItemDrop(group.id, filledItems.length)}
              isDragOver={
                itemDragOverInfo?.groupId === group.id &&
                itemDragOverInfo?.itemIdx === filledItems.length
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

// -- Mini favicon (16x16) for collapsed state --

type MiniStage = "chrome" | "ddg" | "google" | "pin";

function MiniIcon({ item }: { item: FilledSlot }) {
  const [stage, setStage] = useState<MiniStage>("chrome");

  function getSrc(): string {
    if (stage === "chrome") return getFaviconUrl(item.url, 16);
    if (stage === "ddg") return getFaviconDDGUrl(item.url) || PIN_ICON;
    if (stage === "google") return getFaviconFallbackUrl(item.url, 16) || PIN_ICON;
    return PIN_ICON;
  }

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (stage === "chrome" && e.currentTarget.naturalWidth <= 1) setStage("ddg");
  }

  function handleError() {
    if (stage === "chrome") setStage("ddg");
    else if (stage === "ddg") setStage("google");
    else if (stage === "google") setStage("pin");
  }

  return (
    <a
      href={item.url}
      className={styles.miniIconLink}
      title={item.title ?? item.url}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = item.url;
      }}
    >
      <img
        src={getSrc()}
        alt=""
        width={16}
        height={16}
        className={styles.miniIconImg}
        onLoad={handleLoad}
        onError={handleError}
      />
    </a>
  );
}
