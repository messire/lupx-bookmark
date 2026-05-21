import { useState } from "react";
import { getFaviconUrl } from "../../utils/favicon";
import type { SpeedDialSlot } from "../../types";
import styles from "./BookmarkCard.module.css";

const PIN_ICON = chrome.runtime.getURL("icons/pin.svg");

interface BookmarkCardProps {
  slot: SpeedDialSlot;
  showTitle: boolean;
  onClick: () => void; // empty slot → open modal; filled slot → navigate
}

export default function BookmarkCard({ slot, showTitle, onClick }: BookmarkCardProps) {
  const [imgError, setImgError] = useState(false);

  // Empty slot
  if (!slot.url) {
    return (
      <button className={styles.emptyCard} onClick={onClick} title="Add bookmark">
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
      className={styles.card}
      title={slot.title ?? slot.url}
      onClick={handleClick}
    >
      <div className={styles.thumbnail}>
        <img
          src={iconSrc}
          alt=""
          className={styles.favicon}
          onError={() => setImgError(true)}
        />
      </div>
      {showTitle && (
        <span className={styles.title}>{slot.title ?? slot.url}</span>
      )}
    </a>
  );
}
