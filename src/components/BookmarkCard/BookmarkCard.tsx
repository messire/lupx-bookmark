import { useState } from "react";
import { getFaviconFallbackUrl, getDirectFaviconUrls } from "../../utils/favicon";
import { useFaviconContext } from "../../newtab/FaviconCacheContext";
import EditItemModal from "../EditItemModal/EditItemModal";
import type { SpeedDialSlot, CardStyle } from "../../types";
import styles from "./BookmarkCard.module.css";

const PIN_ICON = chrome.runtime.getURL("icons/pin.svg");

const STYLE_CLASS: Record<CardStyle, string> = {
  minimal: styles.styleMinimal,
  glass: styles.styleGlass,
  bento: styles.styleBento,
  icons: styles.styleIcons,
  "neon-pink": styles.styleNeonPink,
  "neon-cyan": styles.styleNeonCyan,
  neumorphic: styles.styleNeumorphic,
  stamp: styles.styleStamp,
  aurora: styles.styleAurora,
};

// Live fallback chain (used while cache is being populated):
// chrome://favicon2/ is handled via fetch() in useFaviconCache -- NOT usable as <img src>
//   1. direct favicon/icon files, in order - straight from the site's own origin
//   2. Google S2 (fallback only -- see favicon.ts for why)
//   3. pin.svg - final fallback
// A number is an index into getDirectFaviconUrls(url); "google" and "pin" are terminal stages.
type FaviconStage = number | "google" | "pin";

interface BookmarkCardProps {
  slot: SpeedDialSlot;
  showTitle: boolean;
  cardStyle: CardStyle;
  onClick: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragOver: boolean;
  onRemove?: () => void;
  onEdit?: (url: string, title: string) => void;
}

export default function BookmarkCard({
  slot,
  showTitle,
  cardStyle,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  onRemove,
  onEdit,
}: BookmarkCardProps) {
  const { getFavicon, refreshFavicon } = useFaviconContext();

  const [faviconStage, setFaviconStage] = useState<FaviconStage>(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  const styleClass = STYLE_CLASS[cardStyle];
  const dragClass = isDragOver ? " " + styles.dragOver : "";

  // Empty slot
  if (!slot.url) {
    return (
      <button
        className={styles.emptyCard + " " + styleClass + dragClass}
        onClick={onClick}
        title="Add bookmark"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <span className={styles.plusIcon}>+</span>
      </button>
    );
  }

  // Filled slot
  const url = slot.url;
  const cachedFavicon = getFavicon(url); // undefined=probing, ""=none, "url"=use it

  function getIconSrc(): string {
    if (cachedFavicon !== undefined) {
      return cachedFavicon || PIN_ICON;
    }
    // Cache not yet populated: direct favicon variants -> Google S2 -> pin
    if (typeof faviconStage === "number")
      return getDirectFaviconUrls(url)[faviconStage] || PIN_ICON;
    if (faviconStage === "google") return getFaviconFallbackUrl(url, 64) || PIN_ICON;
    return PIN_ICON;
  }

  function handleImgLoad(_e: React.SyntheticEvent<HTMLImageElement>) {
    // No-op: a working stage loads normally; a broken one triggers onError instead
  }

  function handleImgError() {
    if (cachedFavicon !== undefined) return;
    if (typeof faviconStage === "number") {
      const directUrls = getDirectFaviconUrls(url);
      if (faviconStage + 1 < directUrls.length) setFaviconStage(faviconStage + 1);
      else setFaviconStage("google");
    } else if (faviconStage === "google") {
      setFaviconStage("pin");
    }
  }

  function handleClick(e: React.MouseEvent) {
    if (confirmDelete || editing) return;
    e.preventDefault();
    // Always re-check the favicon on click -- a cached "success" isn't proof
    // it's the real icon (Google S2 returns a generic default icon that still
    // passes the probe), so trust is re-earned on every visit.
    refreshFavicon(url);
    window.location.href = url;
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDelete(true);
  }

  function handleConfirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onRemove?.();
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDelete(false);
  }

  function handleEditClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditing(true);
  }

  function handleEditSave(editedUrl: string, editedTitle: string) {
    setEditing(false);
    if (editedUrl !== slot.url || editedTitle !== (slot.title ?? slot.url)) {
      onEdit?.(editedUrl, editedTitle);
    }
  }

  const isInteracting = confirmDelete || editing;
  const confirmingClass = confirmDelete ? " " + styles.confirming : "";
  const editingClass = editing ? " " + styles.editing : "";
  const cardClassName = styles.card + " " + styleClass + dragClass + confirmingClass + editingClass;

  return (
    <>
      <a
        href={slot.url}
        className={cardClassName}
        title={isInteracting ? undefined : (slot.title ?? slot.url)}
        onClick={handleClick}
        draggable={!isInteracting}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {confirmDelete ? (
          <div className={styles.confirmOverlay}>
            <span className={styles.confirmLabel}>Remove?</span>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmBtn + " " + styles.confirmYes}
                onClick={handleConfirmDelete}
                title="Yes, remove"
              >
                &#10003;
              </button>
              <button
                className={styles.confirmBtn + " " + styles.confirmNo}
                onClick={handleCancelDelete}
                title="Cancel"
              >
                &#10005;
              </button>
            </div>
          </div>
        ) : (
          <>
            {onEdit && (
              <button
                className={styles.editBtn}
                onClick={handleEditClick}
                title="Edit bookmark"
                aria-label="Edit bookmark"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            {onRemove && (
              <button
                className={styles.deleteBtn}
                onClick={handleDeleteClick}
                title="Remove bookmark"
                aria-label="Remove bookmark"
              >
                &#10005;
              </button>
            )}
            <div className={styles.thumbnail}>
              <img
                src={getIconSrc()}
                alt=""
                className={styles.favicon}
                onLoad={handleImgLoad}
                onError={handleImgError}
              />
            </div>
            {showTitle && cardStyle !== "icons" && (
              <span className={styles.title}>{slot.title ?? slot.url}</span>
            )}
          </>
        )}
      </a>
      {editing && (
        <EditItemModal
          initialTitle={slot.title ?? slot.url ?? ""}
          initialUrl={slot.url ?? ""}
          onSave={handleEditSave}
          onCancel={() => setEditing(false)}
        />
      )}
    </>
  );
}
