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
          <h2 className={styles.sectionTitle}>Grid</h2>

          <label className={styles.field}>
            <span className={styles.label}>Columns</span>
            <div className={styles.stepper}>
              <button
                className={styles.stepBtn}
                onClick={() => updateSettings({ columns: Math.max(1, settings.columns - 1) })}
              >−</button>
              <span className={styles.stepValue}>{settings.columns}</span>
              <button
                className={styles.stepBtn}
                onClick={() => updateSettings({ columns: Math.min(10, settings.columns + 1) })}
              >+</button>
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Rows</span>
            <div className={styles.stepper}>
              <button
                className={styles.stepBtn}
                onClick={() => updateSettings({ rows: Math.max(1, settings.rows - 1) })}
              >−</button>
              <span className={styles.stepValue}>{settings.rows}</span>
              <button
                className={styles.stepBtn}
                onClick={() => updateSettings({ rows: Math.min(10, settings.rows + 1) })}
              >+</button>
            </div>
          </label>

          <div className={styles.hint}>
            Total slots: {settings.columns * settings.rows}
          </div>
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
  </StrictMode>
);
