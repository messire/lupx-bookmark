import { useState, useRef } from "react";
import type { CardStyle, SearchEngine } from "../../types";
import { getFaviconFallbackUrl } from "../../utils/favicon";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  engine: SearchEngine;
  onEngineChange: (engine: SearchEngine) => void;
  cardStyle: CardStyle;
}

interface EngineConfig {
  value: SearchEngine;
  name: string;
  homeUrl: string;
  buildUrl: (q: string) => string;
}

const ENGINES: EngineConfig[] = [
  {
    value: "google",
    name: "Google",
    homeUrl: "https://www.google.com",
    buildUrl: (q) => "https://www.google.com/search?q=" + encodeURIComponent(q),
  },
  {
    value: "yandex",
    name: "Yandex",
    homeUrl: "https://www.yandex.com",
    buildUrl: (q) => "https://yandex.com/search/?text=" + encodeURIComponent(q),
  },
  {
    value: "duckduckgo",
    name: "DuckDuckGo",
    homeUrl: "https://duckduckgo.com",
    buildUrl: (q) => "https://duckduckgo.com/?q=" + encodeURIComponent(q),
  },
];

const NEON_CLASS: Partial<Record<CardStyle, string>> = {
  "neon-pink": styles.barNeonPink,
  "neon-cyan": styles.barNeonCyan,
};

export default function SearchBar({ engine, onEngineChange, cardStyle }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const neonClass = NEON_CLASS[cardStyle] ?? "";

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    const eng = ENGINES.find((e) => e.value === engine) ?? ENGINES[0];
    window.location.href = eng.buildUrl(q);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <div className={styles.bar + (neonClass ? " " + neonClass : "")}>
      {/* Engine selector -- icon buttons */}
      <div className={styles.engineGroup} role="group" aria-label="Search engine">
        {ENGINES.map((e) => (
          <EngineButton
            key={e.value}
            config={e}
            active={engine === e.value}
            onClick={() => {
              onEngineChange(e.value);
              inputRef.current?.focus();
            }}
          />
        ))}
      </div>

      {/* Search input */}
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
        aria-label="Search query"
      />

      {/* Search button */}
      <button className={styles.searchBtn} onClick={handleSearch} aria-label="Search">
        Search
      </button>
    </div>
  );
}

// -- Single engine icon button --

// Fallback chain: Google S2 -> letter
type FaviconStage = "google" | "letter";

function EngineButton({
  config,
  active,
  onClick,
}: {
  config: EngineConfig;
  active: boolean;
  onClick: () => void;
}) {
  const [stage, setStage] = useState<FaviconStage>("google");

  const iconUrl = stage === "google" ? getFaviconFallbackUrl(config.homeUrl, 32) : "";

  function handleError() {
    setStage("letter");
  }

  return (
    <button
      className={styles.engineBtn + (active ? " " + styles.engineActive : "")}
      onClick={onClick}
      title={config.name}
      aria-pressed={active}
    >
      {stage !== "letter" ? (
        <img
          src={iconUrl}
          alt={config.name}
          width={18}
          height={18}
          className={styles.engineIcon}
          onError={handleError}
        />
      ) : (
        <span className={styles.engineFallback}>{config.name[0]}</span>
      )}
    </button>
  );
}
