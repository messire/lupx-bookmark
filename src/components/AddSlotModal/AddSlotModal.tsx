import { useState, useEffect, useRef } from "react";
import type { HistorySuggestion } from "../../types";
import styles from "./AddSlotModal.module.css";

interface AddSlotModalProps {
  onConfirm: (url: string, title: string) => void;
  onClose: () => void;
}

function toSuggestions(items: chrome.history.HistoryItem[]): HistorySuggestion[] {
  return items
    .filter((item) => item.url && item.title)
    .map((item) => ({
      url: item.url!,
      title: item.title!,
      visitCount: item.visitCount ?? 0,
    }));
}

export default function AddSlotModal({ onConfirm, onClose }: AddSlotModalProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<HistorySuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Fetch history suggestions as user types
  useEffect(() => {
    if (!query.trim()) {
      // Show top visited sites when input is empty
      chrome.history.search(
        { text: "", maxResults: 6, startTime: 0 },
        (items) => setSuggestions(toSuggestions(items))
      );
      return;
    }
    chrome.history.search(
      { text: query, maxResults: 6, startTime: 0 },
      (items) => setSuggestions(toSuggestions(items))
    );
  }, [query]);

  function confirm(url: string, title: string) {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    onConfirm(normalized, title || normalized);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    confirm(query.trim(), query.trim());
  }

  function handleSuggestionClick(s: HistorySuggestion) {
    confirm(s.url, s.title);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.label}>Enter address or pick from history</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="https://..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className={styles.addButton}>Add</button>
        </form>

        {suggestions.length > 0 && (
          <ul className={styles.suggestions}>
            {suggestions.map((s) => (
              <li key={s.url}>
                <button
                  className={styles.suggestion}
                  onClick={() => handleSuggestionClick(s)}
                >
                  <span className={styles.suggestionTitle}>{s.title}</span>
                  <span className={styles.suggestionUrl}>{s.url}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
