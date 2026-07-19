import { useState, useEffect, useMemo, useRef } from "react";
import styles from "./EditItemModal.module.css";

interface EditItemModalProps {
  initialTitle: string;
  initialUrl: string;
  onSave: (url: string, title: string) => void;
  onCancel: () => void;
}

export default function EditItemModal({
  initialTitle,
  initialUrl,
  onSave,
  onCancel,
}: EditItemModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);
  const titleRef = useRef<HTMLInputElement>(null);
  const logoUrl = useMemo(() => chrome.runtime.getURL("icons/lupx_logo.png"), []);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    const normalizedUrl = trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`;
    onSave(normalizedUrl, title.trim() || normalizedUrl);
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <img src={logoUrl} alt="" className={styles.watermark} />

        <div className={styles.content}>
          <h2 className={styles.title}>Editing</h2>

          <label className={styles.fieldLabel} htmlFor="edit-item-title">
            Title
          </label>
          <input
            id="edit-item-title"
            ref={titleRef}
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className={styles.fieldLabel} htmlFor="edit-item-url">
            URL
          </label>
          <input
            id="edit-item-url"
            type="text"
            className={styles.input}
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton}>
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
