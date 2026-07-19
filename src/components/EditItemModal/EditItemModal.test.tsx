import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import EditItemModal from "./EditItemModal";

afterEach(cleanup);

function renderModal(props: Partial<Parameters<typeof EditItemModal>[0]> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(
    <EditItemModal
      initialTitle="GitHub"
      initialUrl="https://github.com"
      onSave={onSave}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onSave, onCancel };
}

function getTitleInput() {
  return screen.getByLabelText("Title") as HTMLInputElement;
}

function getUrlInput() {
  return screen.getByLabelText("URL") as HTMLInputElement;
}

describe("EditItemModal — initial render", () => {
  it("prefills title and url from props and focuses the title input", () => {
    renderModal();
    expect(getTitleInput().value).toBe("GitHub");
    expect(getUrlInput().value).toBe("https://github.com");
    expect(document.activeElement).toBe(getTitleInput());
  });
});

describe("EditItemModal — save", () => {
  it("calls onSave with the edited title and url", () => {
    const { onSave } = renderModal();
    fireEvent.change(getTitleInput(), { target: { value: "GitHub Home" } });
    fireEvent.change(getUrlInput(), { target: { value: "https://github.com/explore" } });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith("https://github.com/explore", "GitHub Home");
  });

  it("prepends https:// to a url missing a protocol", () => {
    const { onSave } = renderModal();
    fireEvent.change(getUrlInput(), { target: { value: "example.com" } });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith("https://example.com", "GitHub");
  });

  it("falls back to the url as the title when title is cleared", () => {
    const { onSave } = renderModal();
    fireEvent.change(getTitleInput(), { target: { value: "  " } });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith("https://github.com", "https://github.com");
  });

  it("does not call onSave when the url is empty", () => {
    const { onSave } = renderModal();
    fireEvent.change(getUrlInput(), { target: { value: "   " } });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("EditItemModal — cancel", () => {
  it("calls onCancel when the Cancel button is clicked", () => {
    const { onCancel } = renderModal();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Escape is pressed", () => {
    const { onCancel } = renderModal();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the overlay backdrop is clicked", () => {
    const { onCancel } = renderModal();
    // Structure: overlay-div > form(modal) > ...
    const overlay = (getTitleInput().closest("form") as HTMLFormElement)
      .parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not call onCancel when the modal card itself is clicked", () => {
    const { onCancel } = renderModal();
    const modal = getTitleInput().closest("form") as HTMLFormElement;
    fireEvent.click(modal);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
