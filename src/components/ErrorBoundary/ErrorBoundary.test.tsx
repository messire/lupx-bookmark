import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

afterEach(cleanup);

function suppressConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("test explosion");
  return <span>child content</span>;
}

describe("ErrorBoundary — no error", () => {
  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("child content")).toBeTruthy();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });
});

describe("ErrorBoundary — error caught", () => {
  it("shows the fallback heading when a child throws", () => {
    suppressConsoleError();
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it("displays the thrown error message in the fallback", () => {
    suppressConsoleError();
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("test explosion")).toBeTruthy();
  });

  it("hides the children and shows a Reload tab button", () => {
    suppressConsoleError();
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("child content")).toBeNull();
    expect(screen.getByRole("button", { name: /reload tab/i })).toBeTruthy();
  });

  it("calls window.location.reload when the Reload tab button is clicked", () => {
    suppressConsoleError();
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { reload: reloadMock },
    });
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: /reload tab/i }));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
