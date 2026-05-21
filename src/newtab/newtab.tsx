import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useSpeedDial } from "./useSpeedDial";
import { useSettings } from "./useSettings";
import { useBackground } from "./useBackground";
import { useGridCardSize } from "./useGridCardSize";
import BookmarkCard from "../components/BookmarkCard/BookmarkCard";
import AddSlotModal from "../components/AddSlotModal/AddSlotModal";
import SettingsPanel from "../components/SettingsPanel/SettingsPanel";
import styles from "./newtab.module.css";

function App() {
  const { settings, updateSettings } = useSettings();
  const { slots, setSlot, swapSlots } = useSpeedDial(settings.columns * settings.rows);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useBackground(settings.background);
  const cardWidth = useGridCardSize(settings.columns, settings.rows);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else if (settings.theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [settings.theme]);

  async function handleConfirm(url: string, title: string) {
    if (activeSlotId !== null) {
      await setSlot(Number(activeSlotId), url, title);
    }
    setActiveSlotId(null);
  }

  function handleDragStart(index: number) {
    setDragFromIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault(); // required to allow drop
    setDragOverIndex(index);
  }

  async function handleDrop(toIndex: number) {
    if (dragFromIndex !== null && dragFromIndex !== toIndex) {
      await swapSlots(dragFromIndex, toIndex);
    }
    setDragFromIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragFromIndex(null);
    setDragOverIndex(null);
  }

  return (
    <>
      <main
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${settings.columns}, ${cardWidth}px)` }}
        onDragEnd={handleDragEnd}
      >
        {slots.map((slot) => {
          const index = Number(slot.id);
          return (
            <BookmarkCard
              key={slot.id}
              slot={slot}
              showTitle={settings.showTitles}
              cardStyle={settings.cardStyle}
              onClick={() => setActiveSlotId(slot.id)}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              isDragOver={dragOverIndex === index}
            />
          );
        })}
      </main>

      <button
        className={styles.settingsBtn}
        onClick={() => setSettingsOpen(true)}
        title="Settings"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {activeSlotId !== null && (
        <AddSlotModal
          onConfirm={handleConfirm}
          onClose={() => setActiveSlotId(null)}
        />
      )}
    </>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
