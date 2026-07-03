import { useState, useEffect, useRef, useCallback } from "react";
import type { Settings, BackgroundType, CardStyle } from "../../types";
import { MIN_MINI_ICON_SIZE, MAX_MINI_ICON_SIZE, MINI_ICON_SIZE_STEP } from "../../types";
import { saveBackgroundImage } from "../../newtab/useBackground";
import { useWallpapers } from "../../newtab/useWallpapers";
import styles from "./SettingsPanel.module.css";

interface GroupInfo {
  id: string;
  name: string;
  miniIconSize: number;
}

interface SettingsPanelProps {
  open: boolean;
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  onClose: () => void;
  groups: GroupInfo[];
  onAddGroup: () => void;
  onDeleteGroup: (id: string) => void;
  onSwapGroups: (idxA: number, idxB: number) => void;
  onChangeIconSize: (groupId: string, size: number) => void;
}

const BG_TYPES: { value: BackgroundType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "color", label: "Color" },
  { value: "gradient", label: "Gradient" },
  { value: "image", label: "Image" },
];

const CARD_STYLES: { value: CardStyle; label: string; description: string }[] = [
  { value: "minimal", label: "Minimal", description: "Clean, borderless" },
  { value: "glass", label: "Glass", description: "Frosted blur effect" },
  { value: "bento", label: "Bento", description: "Solid tiles with shadow" },
  { value: "icons", label: "Icons", description: "Icon-only, square" },
  { value: "neon-pink", label: "Neon Pink", description: "Cyberpunk pink glow" },
  { value: "neon-cyan", label: "Neon Cyan", description: "Cyberpunk cyan glow" },
  { value: "neumorphic", label: "Soft UI", description: "Extruded press feel" },
  { value: "stamp", label: "Stamp", description: "Polaroid photo frame" },
  { value: "aurora", label: "Aurora", description: "Living gradient" },
];

const MIN_WIDTH = 240;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 360;
const STORAGE_KEY = "settingsPanelWidth";

function loadWidth(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const n = parseInt(saved, 10);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    }
  } catch {
    // ignore
  }
  return DEFAULT_WIDTH;
}

export default function SettingsPanel({
  open,
  settings,
  onUpdate,
  onClose,
  groups,
  onAddGroup,
  onDeleteGroup,
  onSwapGroups,
  onChangeIconSize,
}: SettingsPanelProps) {
  const [oldSettings, setOldSettings] = useState<Settings | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpapers = useWallpapers();

  // ── Panel resize ────────────────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState<number>(loadWidth);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: panelWidth };
    },
    [panelWidth],
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragRef.current.startWidth + delta));
      setPanelWidth(next);
    }
    function onMouseUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      // persist after drag ends
      setPanelWidth((w) => {
        try {
          localStorage.setItem(STORAGE_KEY, String(w));
        } catch {
          /* ignore */
        }
        return w;
      });
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ── Settings logic ──────────────────────────────────────────────────────
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  useEffect(() => {
    if (open) setOldSettings(settingsRef.current);
  }, [open]);

  const hasChanges =
    oldSettings !== null && JSON.stringify(oldSettings) !== JSON.stringify(settings);

  function handleUpdate(patch: Partial<Settings>) {
    if (oldSettings === null) setOldSettings({ ...settings });
    onUpdate(patch);
  }

  function updateBackground(patch: Partial<Settings["background"]>) {
    handleUpdate({ background: { ...settings.background, ...patch } });
  }

  const handleClose = useCallback(() => {
    setOldSettings(null);
    onClose();
  }, [onClose]);

  function handleRollback() {
    if (!oldSettings) return;
    onUpdate(oldSettings);
    setOldSettings(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    saveBackgroundImage(file).then(() => {
      updateBackground({ type: "image", imageUrl: "" });
    });
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const bg = settings.background;

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ""}`}
        onClick={handleClose}
      />

      <aside
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        style={{ width: panelWidth }}
      >
        {/* Resize handle */}
        <div className={styles.resizeHandle} onMouseDown={handleResizeMouseDown} />

        <header className={styles.header}>
          <div className={styles.headerActions}>
            <button className={styles.closeBtn} onClick={handleClose} title="Close">
              &#10005;
            </button>
            {hasChanges && (
              <button className={styles.rollbackBtn} onClick={handleRollback}>
                Rollback
              </button>
            )}
          </div>
          <h2 className={styles.title}>Settings</h2>
        </header>

        <div className={styles.body}>
          {/* Layout */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Layout</h3>

            <div className={styles.field}>
              <span className={styles.label}>Groups</span>
              <button className={styles.stepBtn} onClick={onAddGroup} title="Add group">
                +
              </button>
            </div>
            {groups.map((g, i) => (
              <div key={g.id} className={styles.groupRow}>
                <div className={styles.groupMoveBtns}>
                  <button
                    className={styles.groupMoveBtn}
                    onClick={() => onSwapGroups(i, i - 1)}
                    title="Move up"
                    aria-label={`Move group ${g.name} up`}
                    disabled={i === 0}
                  >
                    &#9650;
                  </button>
                  <button
                    className={styles.groupMoveBtn}
                    onClick={() => onSwapGroups(i, i + 1)}
                    title="Move down"
                    aria-label={`Move group ${g.name} down`}
                    disabled={i === groups.length - 1}
                  >
                    &#9660;
                  </button>
                </div>
                <span className={styles.groupRowName}>{g.name}</span>
                <div className={styles.iconSizeControl} title="Mini icon size when collapsed">
                  <button
                    className={styles.iconSizeBtn}
                    onClick={() =>
                      onChangeIconSize(
                        g.id,
                        Math.max(MIN_MINI_ICON_SIZE, g.miniIconSize - MINI_ICON_SIZE_STEP),
                      )
                    }
                    disabled={g.miniIconSize <= MIN_MINI_ICON_SIZE}
                    aria-label={`Decrease icon size for ${g.name}`}
                  >
                    &minus;
                  </button>
                  <span className={styles.iconSizeValue}>{g.miniIconSize}px</span>
                  <button
                    className={styles.iconSizeBtn}
                    onClick={() =>
                      onChangeIconSize(
                        g.id,
                        Math.min(MAX_MINI_ICON_SIZE, g.miniIconSize + MINI_ICON_SIZE_STEP),
                      )
                    }
                    disabled={g.miniIconSize >= MAX_MINI_ICON_SIZE}
                    aria-label={`Increase icon size for ${g.name}`}
                  >
                    +
                  </button>
                </div>
                <button
                  className={styles.groupDeleteBtn}
                  onClick={() => onDeleteGroup(g.id)}
                  title="Delete group"
                  aria-label={`Delete group ${g.name}`}
                  disabled={groups.length <= 1}
                >
                  ✕
                </button>
              </div>
            ))}

            <div className={styles.field}>
              <span className={styles.label}>Items per row</span>
              <div className={styles.stepper}>
                <button
                  className={styles.stepBtn}
                  onClick={() =>
                    handleUpdate({ itemsPerRow: Math.max(2, settings.itemsPerRow - 1) })
                  }
                >
                  &minus;
                </button>
                <span className={styles.stepValue}>{settings.itemsPerRow}</span>
                <button
                  className={styles.stepBtn}
                  onClick={() =>
                    handleUpdate({ itemsPerRow: Math.min(10, settings.itemsPerRow + 1) })
                  }
                >
                  +
                </button>
              </div>
            </div>

            <div className={styles.hint}>Max 16 items per group</div>
          </section>

          {/* Appearance */}
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

          {/* Background */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Background</h3>

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

            {bg.type === "gradient" && (
              <>
                <div className={styles.field}>
                  <span className={styles.label}>From</span>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={bg.gradient.from}
                    onChange={(e) =>
                      updateBackground({ gradient: { ...bg.gradient, from: e.target.value } })
                    }
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>To</span>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={bg.gradient.to}
                    onChange={(e) =>
                      updateBackground({ gradient: { ...bg.gradient, to: e.target.value } })
                    }
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Angle &mdash; {bg.gradient.angle}&deg;</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={bg.gradient.angle}
                    className={styles.rangeInput}
                    onChange={(e) =>
                      updateBackground({
                        gradient: { ...bg.gradient, angle: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </>
            )}

            {bg.type === "image" && (
              <>
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
