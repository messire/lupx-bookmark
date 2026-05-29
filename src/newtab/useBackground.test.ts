import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBackground, BG_IMAGE_STORAGE_KEY } from "./useBackground";
import type { Background } from "../types";
import { DEFAULT_BACKGROUND } from "../types";
import { seedStorage, fireStorageChange } from "../test/setup";

// ── Helpers ───────────────────────────────────────────────────────────────

function bg(overrides: Partial<Background> = {}): Background {
  return { ...DEFAULT_BACKGROUND, ...overrides };
}

/** jsdom normalises hex colours to rgb() when read back from style. */
function rgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("useBackground — type: none", () => {
  it("sets data-bg to 'none' and leaves body styles empty", async () => {
    renderHook(() => useBackground(bg({ type: "none" })));
    await act(async () => {});

    expect(document.documentElement.getAttribute("data-bg")).toBe("none");
    expect(document.body.style.backgroundColor).toBe("");
    expect(document.body.style.backgroundImage).toBe("");
  });
});

describe("useBackground — type: color", () => {
  it("applies backgroundColor to body", async () => {
    renderHook(() => useBackground(bg({ type: "color", color: "#ff0000" })));
    await act(async () => {});

    expect(document.body.style.backgroundColor).toBe(rgb("#ff0000"));
    expect(document.body.style.backgroundImage).toBe("");
  });

  it("sets data-bg to 'light' for a high-luminance colour", async () => {
    renderHook(() => useBackground(bg({ type: "color", color: "#ffffff" })));
    await act(async () => {});

    expect(document.documentElement.getAttribute("data-bg")).toBe("light");
  });

  it("sets data-bg to 'dark' for a low-luminance colour", async () => {
    renderHook(() => useBackground(bg({ type: "color", color: "#000000" })));
    await act(async () => {});

    expect(document.documentElement.getAttribute("data-bg")).toBe("dark");
  });
});

describe("useBackground — type: gradient", () => {
  it("applies a linear-gradient to body", async () => {
    renderHook(() =>
      useBackground(
        bg({ type: "gradient", gradient: { from: "#ff0000", to: "#0000ff", angle: 90 } }),
      ),
    );
    await act(async () => {});

    expect(document.body.style.backgroundImage).toContain("linear-gradient");
    expect(document.body.style.backgroundImage).toContain("90deg");
    expect(document.body.style.backgroundImage).toContain(rgb("#ff0000"));
    expect(document.body.style.backgroundImage).toContain(rgb("#0000ff"));
  });

  it("sets data-bg to 'image' (gradient always uses white text + shadow)", async () => {
    renderHook(() =>
      useBackground(
        bg({ type: "gradient", gradient: { from: "#ffffff", to: "#ffffff", angle: 0 } }),
      ),
    );
    await act(async () => {});

    expect(document.documentElement.getAttribute("data-bg")).toBe("image");
  });
});

describe("useBackground — type: image (external URL)", () => {
  it("applies url() backgroundImage when imageUrl is set", async () => {
    renderHook(() => useBackground(bg({ type: "image", imageUrl: "https://example.com/bg.jpg" })));
    await act(async () => {});

    expect(document.body.style.backgroundImage).toContain("https://example.com/bg.jpg");
    expect(document.body.style.backgroundSize).toBe("cover");
    expect(document.body.style.backgroundPosition).toContain("center");
    expect(document.body.style.backgroundRepeat).toBe("no-repeat");
    expect(document.body.style.backgroundAttachment).toBe("fixed");
  });

  it("sets data-bg to 'image'", async () => {
    renderHook(() => useBackground(bg({ type: "image", imageUrl: "https://example.com/bg.jpg" })));
    await act(async () => {});

    expect(document.documentElement.getAttribute("data-bg")).toBe("image");
  });
});

describe("useBackground — type: image (local file upload)", () => {
  it("loads image data from chrome.storage.local when imageUrl is empty", async () => {
    const dataUrl = "data:image/png;base64,abc123";
    seedStorage("local", { [BG_IMAGE_STORAGE_KEY]: dataUrl });

    renderHook(() => useBackground(bg({ type: "image", imageUrl: "" })));
    await act(async () => {});

    expect(document.body.style.backgroundImage).toContain("abc123");
  });

  it("does NOT query storage when imageUrl is already set", async () => {
    seedStorage("local", { [BG_IMAGE_STORAGE_KEY]: "data:image/png;base64,SHOULD_NOT_APPEAR" });

    renderHook(() => useBackground(bg({ type: "image", imageUrl: "https://example.com/bg.jpg" })));
    await act(async () => {});

    expect(document.body.style.backgroundImage).toContain("example.com");
    expect(document.body.style.backgroundImage).not.toContain("SHOULD_NOT_APPEAR");
  });

  it("reacts to a storage change arriving from another tab", async () => {
    renderHook(() => useBackground(bg({ type: "image", imageUrl: "" })));
    await act(async () => {});

    expect(document.body.style.backgroundImage).toBe("");

    act(() => {
      fireStorageChange("local", {
        [BG_IMAGE_STORAGE_KEY]: { newValue: "data:image/png;base64,fresh" },
      });
    });

    expect(document.body.style.backgroundImage).toContain("fresh");
  });

  it("ignores storage changes for other keys", async () => {
    renderHook(() => useBackground(bg({ type: "image", imageUrl: "" })));
    await act(async () => {});

    act(() => {
      fireStorageChange("local", {
        someOtherKey: { newValue: "irrelevant" },
      });
    });

    expect(document.body.style.backgroundImage).toBe("");
  });

  it("removes the onChanged listener on unmount", async () => {
    const { unmount } = renderHook(() => useBackground(bg({ type: "image", imageUrl: "" })));
    await act(async () => {});

    unmount();

    expect(chrome.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
  });
});

describe("useBackground — style reset between background types", () => {
  it("clears backgroundImage when switching from image to color", async () => {
    const { rerender } = renderHook((b: Background) => useBackground(b), {
      initialProps: bg({ type: "image", imageUrl: "https://example.com/bg.jpg" }),
    });
    await act(async () => {});

    expect(document.body.style.backgroundImage).not.toBe("");

    rerender(bg({ type: "color", color: "#123456" }));
    await act(async () => {});

    expect(document.body.style.backgroundImage).toBe("");
    expect(document.body.style.backgroundColor).toBe(rgb("#123456"));
  });

  it("clears backgroundColor when switching from color to gradient", async () => {
    const { rerender } = renderHook((b: Background) => useBackground(b), {
      initialProps: bg({ type: "color", color: "#ff0000" }),
    });
    await act(async () => {});

    rerender(bg({ type: "gradient", gradient: { from: "#aaa", to: "#bbb", angle: 45 } }));
    await act(async () => {});

    expect(document.body.style.backgroundColor).toBe("");
    expect(document.body.style.backgroundImage).toContain("linear-gradient");
  });
});
