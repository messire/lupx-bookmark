import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { useSpeedDial } from "./useSpeedDial";
import { useSettings } from "./useSettings";
import BookmarkCard from "../components/BookmarkCard/BookmarkCard";
import AddSlotModal from "../components/AddSlotModal/AddSlotModal";
import styles from "./newtab.module.css";

function App() {
  const { slots, setSlot } = useSpeedDial();
  const { settings } = useSettings();
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  async function handleConfirm(url: string, title: string) {
    if (activeSlotId !== null) {
      await setSlot(activeSlotId, url, title);
    }
    setActiveSlotId(null);
  }

  return (
    <>
      <main
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${settings.columns}, 1fr)` }}
      >
        {slots.map((slot) => (
          <BookmarkCard
            key={slot.id}
            slot={slot}
            showTitle={settings.showTitles}
            onClick={() => setActiveSlotId(slot.id)}
          />
        ))}
      </main>

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
