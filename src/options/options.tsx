import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useSettings } from "../newtab/useSettings";
import styles from "./options.module.css";

function OptionsApp() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>LUPX Bookmark</h1>
        <p className={styles.subtitle}>Settings</p>
      </header>

      <main className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Layout</h2>

          <label className={styles.field}>
            <span className={styles.label}>Groups</span>
            <div className={styles.stepper}>
              <button
                className={styles.stepBtn}
                onClick={() =>
                  updateSettings({ accordionCount: Math.max(1, settings.accordionCount - 1) })
                }
              >
                −
              </button>
              <span className={styles.stepValue}>{settings.accordionCount}</span>
              <button
                className={styles.stepBtn}
                onClick={() =>
                  updateSettings({ accordionCount: Math.min(10, settings.accordionCount + 1) })
                }
              >
                +
              </button>
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Items per row</span>
            <div className={styles.stepper}>
              <button
                className={styles.stepBtn}
                onClick={() =>
                  updateSettings({ itemsPerRow: Math.max(2, settings.itemsPerRow - 1) })
                }
              >
                −
              </button>
              <span className={styles.stepValue}>{settings.itemsPerRow}</span>
              <button
                className={styles.stepBtn}
                onClick={() =>
                  updateSettings({ itemsPerRow: Math.min(10, settings.itemsPerRow + 1) })
                }
              >
                +
              </button>
            </div>
          </label>

          <div className={styles.hint}>Max 16 items per group</div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>

          <label className={styles.field}>
            <span className={styles.label}>Show titles</span>
            <button
              className={`${styles.toggle} ${settings.showTitles ? styles.toggleOn : ""}`}
              onClick={() => updateSettings({ showTitles: !settings.showTitles })}
              aria-pressed={settings.showTitles}
            >
              <span className={styles.toggleThumb} />
            </button>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Theme</span>
            <select
              className={styles.select}
              value={settings.theme}
              onChange={(e) =>
                updateSettings({ theme: e.target.value as "light" | "dark" | "system" })
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </section>
      </main>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root element not found");

createRoot(root).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
);
