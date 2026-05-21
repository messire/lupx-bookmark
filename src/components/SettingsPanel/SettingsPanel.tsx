import { useState, useEffect, useRef } from "react";
import type { Settings, BackgroundType, CardStyle } from "../../types";
import { saveBackgroundImage } from "../../newtab/useBackground";
import { useWallpapers } from "../../newtab/useWallpapers";
import styles from "./SettingsPanel.module.css";

interface SettingsPanelProps {
  open: boolean;
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => Promise<void>;
  onClose: () => void;
}

const BG_TYPES: { value: BackgroundType; label: string }[] = [
  { value: "none",     label: "None"     },
  { value: "color",    label: "Color"    },
  { value: "gradient", label: "Gradient" },
  { value: "image",    label: "Image"    },
];

const CARD_STYLES: { value: CardStyle; label: string; description: string }[] = [
  { value: "minimal", label: "Minimal",  description: "Clean, borderless" },
  { value: "glass",   label: "Glass",    description: "Frosted blur effect" },
  { value: "bento",   label: "Bento",    description: "Solid tiles with shadow" },
  { value: "icons",   label: "Icons",    description: "Icon-only, square" },
];

export default function SettingsPanel({ open, settings, onUpdate, onClose }: SettingsPanelProps) {
  const [oldSettings, setOldSettings] = useState<Settings | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpapers = useWallpapers();

  useEffect(() => {
    if (open) setOldSettings(settings);
  }, [open]);

  const hasChanges =
    oldSettings !== null &&
    JSON.stringify(oldSettings) !== JSON.stringify(settings);

  async function handleUpdate(patch: Partial<Settings>) {
    if (oldSettings === null) setOldSettings({ ...settings });
    await onUpdate(patch);
  }

  function updateBackground(patch: Partial<Settings["background"]>) {
    handleUpdate({ background: { ...settings.background, ...patch } });
  }

  async function handleClose() {
    setOldSettings(null);
    onClose();
  }

  async function handleRollback() {
    if (!oldSettings) return;
    await onUpdate(oldSettings);
    setOldSettings(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await saveBackgroundImage(file);
    updateBackground({ type: "image", imageUrl: "" });
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const bg = settings.background;

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ""}`}
        onClick={handleClose}
      />

      <aside className={`${styles.panel} ${open ? styles.panelOpen : ""}`}>
        <header className={styles.header}>
          <div className={styles.headerActions}>
            <button className={styles.closeBtn} onClick={handleClose} title="Close">✕</button>
            {hasChanges && (
              <button className={styles.rollbackBtn} onClick={handleRollback}>Rollback</button>
            )}
          </div>
          <h2 className={styles.title}>Settings</h2>
        </header>

        <div className={styles.body}>

          {/* ── Grid ── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Grid</h3>

            <div className={styles.field}>
              <span className={styles.label}>Columns</span>
              <div className={styles.stepper}>
                <button className={styles.stepBtn} onClick={() => handleUpdate({ columns: Math.max(1, settings.columns - 1) })}>−</button>
                <span className={styles.stepValue}>{settings.columns}</span>
                <button className={styles.stepBtn} onClick={() => handleUpdate({ columns: Math.min(8, settings.columns + 1) })}>+</button>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Rows</span>
              <div className={styles.stepper}>
                <button className={styles.stepBtn} onClick={() => handleUpdate({ rows: Math.max(1, settings.rows - 1) })}>−</button>
                <span className={styles.stepValue}>{settings.rows}</span>
                <button className={styles.stepBtn} onClick={() => handleUpdate({ rows: Math.min(8, settings.rows + 1) })}>+</button>
              </div>
            </div>

            <div className={styles.hint}>Total slots: {settings.columns * settings.rows}</div>
          </section>

          {/* ── Appearance ── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Appearance</h3>

            <div className={styles.field}>
              <span className={styles.label}>Show titles</span>
              <button
                className={`${styles.toggle} ${settings.showTitles ? styles.toggleOn : ""}`}
                onClick={() => handleUpdate({ showTitles: !settings.showTitles })}
                aria-pressed={settings.showTitles}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Theme</span>
              <select
                className={styles.select}
                value={settings.theme}
                onChange={(e) => handleUpdate({ theme: e.target.value as Settings["theme"] })}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Card style</span>
            </div>
            <div className={styles.cardStyleGrid}>
              {CARD_STYLES.map(({ value, label, description }) => (
                <button
                  key={value}
                  className={`${styles.cardStyleBtn} ${settings.cardStyle === value ? styles.cardStyleActive : ""}`}
                  onClick={() => handleUpdate({ cardStyle: value })}
                  title={description}
                >
                  <span className={styles.cardStyleLabel}>{label}</span>
                  <span className={styles.cardStyleDesc}>{description}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Background ── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Background</h3>

            {/* Type selector */}
            <div className={styles.segmented}>
              {BG_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  className={`${styles.segmentBtn} ${bg.type === value ? styles.segmentActive : ""}`}
                  onClick={() => updateBackground({ type: value })}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Color */}
            {bg.type === "color" && (
              <div className={styles.field}>
                <span className={styles.label}>Color</span>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={bg.color}
                  onChange={(e) => updateBackground({ color: e.target.value })}
                />
              </div>
            )}

            {/* Gradient */}
            {bg.type === "gradient" && (
              <>
                <div className={styles.field}>
                  <span className={styles.label}>From</span>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={bg.gradient.from}
                    onChange={(e) => updateBackground({ gradient: { ...bg.gradient, from: e.target.value } })}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>To</span>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={bg.gradient.to}
                    onChange={(e) => updateBackground({ gradient: { ...bg.gradient, to: e.target.value } })}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Angle — {bg.gradient.angle}°</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={bg.gradient.angle}
                    className={styles.rangeInput}
                    onChange={(e) => updateBackground({ gradient: { ...bg.gradient, angle: Number(e.target.value) } })}
                  />
                </div>
              </>
            )}

            {/* Image */}
            {bg.type === "image" && (
              <>
                {/* Wallpaper gallery */}
                {wallpapers.length > 0 && (
                  <div>
                    <span className={styles.subLabel}>Wallpapers</span>
                    <div className={styles.wallpaperGrid}>
                      {wallpapers.map((w) => (
                        <button
                          key={w.name}
                          className={`${styles.wallpaperThumb} ${bg.imageUrl === w.url ? styles.wallpaperSelected : ""}`}
                          onClick={() => updateBackground({ imageUrl: w.url })}
                          title={w.name}
                        >
                          <img src={w.url} alt={w.name} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* URL input */}
                <div className={styles.field}>
                  <span className={styles.label}>URL</span>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="https://..."
                    value={bg.imageUrl.startsWith("chrome-extension://") ? "" : bg.imageUrl}
                    onChange={(e) => updateBackground({ imageUrl: e.target.value })}
                  />
                </div>

                {/* File upload */}
                <div className={styles.field}>
                  <span className={styles.label}>File</span>
                  <button
                    className={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={handleFileChange}
                  />
                </div>
              </>
            )}
          </section>

        </div>
      </aside>
    </>
  );
}
