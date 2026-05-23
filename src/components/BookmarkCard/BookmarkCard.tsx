import { useState } from "react";
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
}: BookmarkCardProps) {
  const [imgError, setImgError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    if (confirmDelete) return;
    e.preventDefault();
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

  return (
    <a
      href={slot.url}
      className={`${styles.card} ${styleClass}${dragClass}${confirmDelete ? ` ${styles.confirming}` : ""}`}
      title={confirmDelete ? undefined : (slot.title ?? slot.url)}
      onClick={handleClick}
      draggable={!confirmDelete}
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
      ) : (
        <>
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
