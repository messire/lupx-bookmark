import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import AddSlotModal from "./AddSlotModal";

afterEach(cleanup);

function mockHistorySearch(items: chrome.history.HistoryItem[]) {
  (chrome.history.search as ReturnType<typeof vi.fn>).mockImplementation(
    (_opts: unknown, cb: (items: chrome.history.HistoryItem[]) => void) => cb(items),
  );
}

function renderModal(props: Partial<Parameters<typeof AddSlotModal>[0]> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(<AddSlotModal onConfirm={onConfirm} onClose={onClose} {...props} />);
  return { onConfirm, onClose };
}

function getInput() {
  return screen.getByPlaceholderText("https://...") as HTMLInputElement;
}

function getForm() {
  return getInput().closest("form") as HTMLFormElement;
}

describe("AddSlotModal — initial render", () => {
  it("focuses the URL input on mount", async () => {
    mockHistorySearch([]);
    renderModal();
    await act(async () => {});
    expect(document.activeElement).toBe(getInput());
  });

  it("calls chrome.history.search with empty text to prefill suggestions", async () => {
    mockHistorySearch([]);
    renderModal();
    await act(async () => {});
    expect(chrome.history.search).toHaveBeenCalledWith(
      expect.objectContaining({ text: "" }),
      expect.any(Function),
    );
  });

  it("renders history suggestions returned by chrome.history.search", async () => {
    mockHistorySearch([
      { id: "1", url: "https://github.com", title: "GitHub", visitCount: 10 },
      { id: "2", url: "https://news.ycombinator.com", title: "Hacker News", visitCount: 5 },
    ]);
    renderModal();
    await act(async () => {});
    expect(screen.getByText("GitHub")).toBeTruthy();
    expect(screen.getByText("Hacker News")).toBeTruthy();
  });
});

describe("AddSlotModal — form submit", () => {
  it("calls onConfirm with the entered URL on submit", async () => {
    mockHistorySearch([]);
    const { onConfirm } = renderModal();
    await act(async () => {});
    fireEvent.change(getInput(), { target: { value: "https://example.com" } });
    fireEvent.submit(getForm());
    expect(onConfirm).toHaveBeenCalledWith("https://example.com", "https://example.com");
  });

  it("prepends https:// to the url but keeps the raw query as the title", async () => {
    mockHistorySearch([]);
    const { onConfirm } = renderModal();
    await act(async () => {});
    fireEvent.change(getInput(), { target: { value: "example.com" } });
    fireEvent.submit(getForm());
    // url gets normalized; title stays as the raw query string
    expect(onConfirm).toHaveBeenCalledWith("https://example.com", "example.com");
  });

  it("does not call onConfirm when the input is empty", async () => {
    mockHistorySearch([]);
    const { onConfirm } = renderModal();
    await act(async () => {});
    fireEvent.submit(getForm());
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("AddSlotModal — suggestions", () => {
  it("calls onConfirm with url and title when a suggestion is clicked", async () => {
    mockHistorySearch([{ id: "1", url: "https://github.com", title: "GitHub", visitCount: 10 }]);
    const { onConfirm } = renderModal();
    await act(async () => {});
    fireEvent.click(screen.getByText("GitHub").closest("button") as HTMLButtonElement);
    expect(onConfirm).toHaveBeenCalledWith("https://github.com", "GitHub");
  });

  it("re-queries history as the user types", async () => {
    mockHistorySearch([]);
    renderModal();
    await act(async () => {});
    const callsBefore = (chrome.history.search as ReturnType<typeof vi.fn>).mock.calls.length;
    await act(async () => {
      fireEvent.change(getInput(), { target: { value: "git" } });
    });
    expect((chrome.history.search as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
      callsBefore,
    );
    expect(chrome.history.search).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: "git" }),
      expect.any(Function),
    );
  });
});

describe("AddSlotModal — keyboard & overlay", () => {
  it("calls onClose when Escape is pressed", async () => {
    mockHistorySearch([]);
    const { onClose } = renderModal();
    await act(async () => {});
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the overlay backdrop is clicked", async () => {
    mockHistorySearch([]);
    const { onClose } = renderModal();
    await act(async () => {});
    // Structure: overlay-div > modal-div > form > input
    const form = getInput().closest("form") as HTMLFormElement;
    const overlay = (form.parentElement as HTMLElement).parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when the modal card itself is clicked", async () => {
    mockHistorySearch([]);
    const { onClose } = renderModal();
    await act(async () => {});
    // modal-div has stopPropagation; clicking it should not reach the overlay
    const modal = (getInput().closest("form") as HTMLFormElement).parentElement as HTMLElement;
    fireEvent.click(modal);
    expect(onClose).not.toHaveBeenCalled();
  });
});
