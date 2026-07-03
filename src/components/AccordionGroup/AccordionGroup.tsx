import { useState, useRef } from "react";
import BookmarkCard from "../BookmarkCard/BookmarkCard";
import { getFaviconFallbackUrl, getDirectFaviconUrls } from "../../utils/favicon";
import { useFaviconContext } from "../../newtab/FaviconCacheContext";
import type { AccordionGroup as AccordionGroupType, CardStyle, SpeedDialSlot } from "../../types";
import { MAX_ITEMS_PER_ACCORDION } from "../../types";
import styles from "./AccordionGroup.module.css";

/** A slot that is guaranteed to have a URL (used for mini icons in collapsed state). */
type FilledSlot = SpeedDialSlot & { url: string };

const PIN_ICON = chrome.runtime.getURL("icons/pin.svg");

// Empty slot sentinel used for the "add" card
const EMPTY_SLOT: SpeedDialSlot = { id: "__add__", url: null, title: null };

/** Header height when the group is expanded (or collapsed with default-size icons). */
const DEFAULT_HEADER_HEIGHT = 44;
/** Breathing room kept above/below the mini icon row when the header grows. */
const HEADER_VERTICAL_PADDING = 8;

// Maps card style to extra CSS class on the accordion container
const ACCORDION_STYLE_CLASS: Record<CardStyle, string> = {
  minimal: styles.accordionMinimal,
  glass: styles.accordionGlass,
  bento: styles.accordionBento,
  icons: styles.accordionMinimal,
  "neon-pink": styles.accordionNeonPink,
  "neon-cyan": styles.accordionNeonCyan,
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
  itemsPerRow: number;
  cardWidth: number;
  showTitles: boolean;
  cardStyle: CardStyle;

  // Item-level drag callbacks (hoisted to newtab.tsx)
  onItemDragStart: (groupId: string, itemIdx: number) => void;
  onItemDragOver: (groupId: string, itemIdx: number, e: React.DragEvent) => void;
  onItemDrop: (groupId: string, itemIdx: number) => void;
  itemDragOverInfo: DragOverInfo | null;

  // Data callbacks
  onClickAdd: (groupId: string) => void;
  onRename: (groupId: string, name: string) => Promise<void>;
  onToggleCollapse: (groupId: string) => Promise<void>;
  onRemoveItem: (groupId: string, itemIdx: number) => Promise<void>;
  onRenameItem: (groupId: string, itemIdx: number, title: string) => Promise<void>;
}

export default function AccordionGroup({
  group,
  itemsPerRow,
  cardWidth,
  showTitles,
  cardStyle,
  onItemDragStart,
  onItemDragOver,
  onItemDrop,
  itemDragOverInfo,
  onClickAdd,
  onRename,
  onToggleCollapse,
  onRemoveItem,
  onRenameItem,
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

  // -- Layout helpers --

  const filledItems = group.items;
  const showAddCard = filledItems.length < MAX_ITEMS_PER_ACCORDION;
  const gridCols = "repeat(" + itemsPerRow + ", " + cardWidth + "px)";

  const groupClass = [styles.accordion, ACCORDION_STYLE_CLASS[cardStyle]].filter(Boolean).join(" ");

  // When collapsed, the header must grow with the mini icon size so the icons
  // keep consistent breathing room instead of just overflowing a fixed-height row.
  // DEFAULT_HEADER_HEIGHT / HEADER_VERTICAL_PADDING mirror the values baked into
  // AccordionGroup.module.css's .header rule.
  const miniLinkBoxSize = group.miniIconSize + 6; // matches MiniIcon's linkBoxSize below
  const headerHeight = group.collapsed
    ? Math.max(DEFAULT_HEADER_HEIGHT, miniLinkBoxSize + HEADER_VERTICAL_PADDING * 2)
    : undefined;

  // -- Render --

  return (
    <div className={groupClass}>
      {/* -- Header -- */}
      <div className={styles.header} style={headerHeight ? { height: headerHeight } : undefined}>
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
                <MiniIcon key={item.id} item={item} size={group.miniIconSize} />
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

// A number is an index into getDirectFaviconUrls(item.url); "google" and "pin" are terminal stages.
type MiniStage = number | "google" | "pin";

/** Rounds an arbitrary mini icon size to a size bucket the favicon services support. */
function faviconSizeBucket(size: number): 16 | 32 | 64 {
  if (size <= 16) return 16;
  if (size <= 32) return 32;
  return 64;
}

function MiniIcon({ item, size }: { item: FilledSlot; size: number }) {
  const { getFavicon, refreshFavicon } = useFaviconContext();
  const [stage, setStage] = useState<MiniStage>(0);

  const cached = getFavicon(item.url); // undefined=probing, ""=none, "url"=use it
  const linkBoxSize = size + 6;

  function getSrc(): string {
    if (cached !== undefined) return cached || PIN_ICON;
    // Cache not yet populated: direct favicon variants -> Google S2 -> pin
    if (typeof stage === "number") return getDirectFaviconUrls(item.url)[stage] || PIN_ICON;
    if (stage === "google")
      return getFaviconFallbackUrl(item.url, faviconSizeBucket(size)) || PIN_ICON;
    return PIN_ICON;
  }

  function handleError() {
    if (cached !== undefined) return;
    if (typeof stage === "number") {
      const directUrls = getDirectFaviconUrls(item.url);
      if (stage + 1 < directUrls.length) setStage(stage + 1);
      else setStage("google");
    } else if (stage === "google") {
      setStage("pin");
    }
  }

  return (
    <a
      href={item.url}
      className={styles.miniIconLink}
      style={{ width: linkBoxSize, height: linkBoxSize }}
      title={item.title ?? item.url}
      onClick={(e) => {
        e.preventDefault();
        // Always re-check the favicon on click -- a cached "success" isn't
        // proof it's the real icon (see BookmarkCard's handleClick).
        refreshFavicon(item.url);
        window.location.href = item.url;
      }}
    >
      <img
        src={getSrc()}
        alt=""
        width={size}
        height={size}
        className={styles.miniIconImg}
        onError={handleError}
      />
    </a>
  );
}
