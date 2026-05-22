import { useState } from "react";
import { getFaviconUrl } from "../../utils/favicon";
import type { SpeedDialSlot, CardStyle } from "../../types";
import styles from "./BookmarkCard.module.css";

const PIN_ICON = chrome.runtime.getURL("icons/pin.svg");

const STYLE_CLASS: Record<CardStyle, string> = {
  minimal:    styles.styleMinimal,
  glass:      styles.styleGlass,
  bento:      styles.styleBento,
  icons:      styles.styleIcons,
  neon:       styles.styleNeon,
  neumorphic: styles.styleNeumorphic,
  stamp:      styles.styleStamp,
  aurora:     styles.styleAurora,
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
}: BookmarkCardProps) {
  const [imgError, setImgError] = useState(false);

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
  const faviconUrl = getFaviconUrl(slot.url, 64);
  const iconSrc = !faviconUrl || imgError ? PIN_ICON : faviconUrl;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    window.location.href = slot.url!;
  }

  return (
    <a
      href={slot.url}
      className={`${styles.card} ${styleClass}${dragClass}`}
      title={slot.title ?? slot.url}
      onClick={handleClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
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
    </a>
  );
}
