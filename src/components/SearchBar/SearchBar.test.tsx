import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import SearchBar from "./SearchBar";
import type { SearchEngine } from "../../types";

// RTL auto-cleanup requires Jest globals; with globals:false we must call it manually.
afterEach(cleanup);

// ── window.location mock ──────────────────────────────────────────────────

let navigatedTo = "";

beforeEach(() => {
  navigatedTo = "";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return navigatedTo;
      },
      set href(v: string) {
        navigatedTo = v;
      },
    },
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────

function renderBar(engine: SearchEngine = "google", onEngineChange = vi.fn()) {
  render(<SearchBar engine={engine} onEngineChange={onEngineChange} cardStyle="minimal" />);
  return { onEngineChange };
}

function getInput() {
  return screen.getByRole("textbox", { name: /search query/i }) as HTMLInputElement;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("SearchBar — engine selector", () => {
  it("renders buttons for all three engines", () => {
    renderBar();
    expect(screen.getByTitle("Google")).toBeTruthy();
    expect(screen.getByTitle("Yandex")).toBeTruthy();
    expect(screen.getByTitle("DuckDuckGo")).toBeTruthy();
  });

  it("marks the active engine with aria-pressed='true'", () => {
    renderBar("yandex");
    expect(screen.getByTitle("Yandex").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTitle("Google").getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onEngineChange with the engine value when an engine button is clicked", () => {
    const { onEngineChange } = renderBar("google");
    fireEvent.click(screen.getByTitle("DuckDuckGo"));
    expect(onEngineChange).toHaveBeenCalledWith("duckduckgo");
  });
});

describe("SearchBar — search navigation", () => {
  it("navigates to Google when Enter is pressed with a query", () => {
    renderBar("google");
    fireEvent.change(getInput(), { target: { value: "typescript" } });
    fireEvent.keyDown(getInput(), { key: "Enter" });

    expect(navigatedTo).toContain("google.com");
    expect(navigatedTo).toContain(encodeURIComponent("typescript"));
  });

  it("navigates to Yandex for the yandex engine", () => {
    renderBar("yandex");
    fireEvent.change(getInput(), { target: { value: "hello" } });
    fireEvent.keyDown(getInput(), { key: "Enter" });

    expect(navigatedTo).toContain("yandex.com");
  });

  it("navigates to DuckDuckGo for the duckduckgo engine", () => {
    renderBar("duckduckgo");
    fireEvent.change(getInput(), { target: { value: "privacy" } });
    fireEvent.keyDown(getInput(), { key: "Enter" });

    expect(navigatedTo).toContain("duckduckgo.com");
  });

  it("navigates when the Search button is clicked", () => {
    renderBar("google");
    fireEvent.change(getInput(), { target: { value: "vitest" } });
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    expect(navigatedTo).toContain("google.com");
  });

  it("opens the engine's home page when the query is empty or only whitespace", () => {
    renderBar("google");
    fireEvent.change(getInput(), { target: { value: "   " } });
    fireEvent.keyDown(getInput(), { key: "Enter" });

    expect(navigatedTo).toBe("https://www.google.com");
  });

  it("opens the correct home page per engine when the query is empty", () => {
    renderBar("yandex");
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

    expect(navigatedTo).toBe("https://www.yandex.com");
  });

  it("does not navigate on non-Enter key presses", () => {
    renderBar("google");
    fireEvent.change(getInput(), { target: { value: "hello" } });
    fireEvent.keyDown(getInput(), { key: "ArrowDown" });

    expect(navigatedTo).toBe("");
  });
});
