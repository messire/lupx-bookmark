import { useState, useRef } from "react";
import { getFaviconUrl } from "../../utils/favicon";
import type { SpeedDialSlot, CardStyle } from "../../types";
import styles from "./BookmarkCard.module.css";

const PIN_ICON = chrome.runtime.getURL("icons/pin.svg");

const STYLE_CLASS: Record<CardStyle, string> = {
  minimal: styles.styleMinimal,
  glass: styles.styleGlass,
  bento: styles.styleBento,
  icons: styles.styleIcons,
  neon: styles.styleNeon,
  neumorphic: styles.styleNeumorphic,
  stamp: styles.styleStamp,
  aurora: styles.styleAurora,
};

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
  onRename?: (title: string) => void;
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
  onRename,
}: BookmarkCardProps) {
  const [imgError, setImgError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const styleClass = STYLE_CLASS[cardStyle];
  const dragClass = isDragOver ? ` ${styles.dragOver}` : "";

  // Empty slot
  if (!slot.url) {
    return (
      <button
        className={`${styles.emptyCard} ${styleClass}${dragClass}`}
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
  const faviconUrl = getFaviconUrl(url, 64);
  const iconSrc = !faviconUrl || imgError ? PIN_ICON : faviconUrl;

  function handleClick(e: React.MouseEvent) {
    if (confirmDelete || editing) return;
    e.preventDefault();
    window.location.href = url;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

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

  // ── Rename ────────────────────────────────────────────────────────────────

  function handleEditClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDraft(slot.title ?? slot.url ?? "");
    setEditing(true);
  }

  function commitEdit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== (slot.title ?? slot.url)) {
      onRename?.(trimmed);
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === "Escape") {
      setEditing(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isInteracting = confirmDelete || editing;

  return (
    <a
      href={slot.url}
      className={`${styles.card} ${styleClass}${dragClass}${confirmDelete ? ` ${styles.confirming}` : ""}${editing ? ` ${styles.editing}` : ""}`}
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
              className={`${styles.confirmBtn} ${styles.confirmYes}`}
              onClick={handleConfirmDelete}
              title="Yes, remove"
            >
              &#10003;
            </button>
            <button
              className={`${styles.confirmBtn} ${styles.confirmNo}`}
              onClick={handleCancelDelete}
              title="Cancel"
            >
              &#10005;
            </button>
          </div>
        </div>
      ) : editing ? (
        <div className={styles.editOverlay}>
          <input
            ref={inputRef}
            className={styles.editInput}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : (
        <>
          {onRename && (
            <button
              className={styles.editBtn}
              onClick={handleEditClick}
              title="Rename bookmark"
              aria-label="Rename bookmark"
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
              src={iconSrc}
              alt=""
              className={styles.favicon}
              onError={() => setImgError(true)}
            />
          </div>
          {showTitle && cardStyle !== "icons" && (
            <span className={styles.title}>{slot.title ?? slot.url}</span>
          )}
        </>
      )}
    </a>
  );
}
