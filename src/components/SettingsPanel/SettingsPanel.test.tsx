import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import SettingsPanel from "./SettingsPanel";
import { DEFAULT_SETTINGS } from "../../types";
import type { Settings } from "../../types";

// ── Module mocks ──────────────────────────────────────────────────────────

vi.mock("../../newtab/useWallpapers", () => ({
  useWallpapers: () => [],
}));

vi.mock("../../newtab/useBackground", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../newtab/useBackground")>();
  return { ...actual, saveBackgroundImage: vi.fn().mockResolvedValue(undefined) };
});

// RTL auto-cleanup requires Jest globals; with globals:false we must call it manually.
afterEach(cleanup);

// ── Helpers ───────────────────────────────────────────────────────────────

function renderPanel(
  settings: Settings = DEFAULT_SETTINGS,
  groups = [{ id: "g1", name: "Work", miniIconSize: 16 }],
  open = true,
) {
  const onUpdate = vi.fn();
  const onClose = vi.fn();
  const onAddGroup = vi.fn();
  const onDeleteGroup = vi.fn();
  const onSwapGroups = vi.fn();
  const onChangeIconSize = vi.fn();

  const { rerender } = render(
    <SettingsPanel
      open={open}
      settings={settings}
      onUpdate={onUpdate}
      onClose={onClose}
      groups={groups}
      onAddGroup={onAddGroup}
      onDeleteGroup={onDeleteGroup}
      onSwapGroups={onSwapGroups}
      onChangeIconSize={onChangeIconSize}
    />,
  );

  function rerenderWith(s: Settings) {
    rerender(
      <SettingsPanel
        open={open}
        settings={s}
        onUpdate={onUpdate}
        onClose={onClose}
        groups={groups}
        onAddGroup={onAddGroup}
        onDeleteGroup={onDeleteGroup}
        onSwapGroups={onSwapGroups}
        onChangeIconSize={onChangeIconSize}
      />,
    );
  }

  return {
    onUpdate,
    onClose,
    onAddGroup,
    onDeleteGroup,
    onSwapGroups,
    onChangeIconSize,
    rerenderWith,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("SettingsPanel — open/close", () => {
  it("renders the Settings heading when open", () => {
    renderPanel();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("calls onClose when the × close button is clicked", () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByTitle("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed while open", () => {
    const { onClose } = renderPanel(DEFAULT_SETTINGS, undefined, true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on Escape when panel is closed", () => {
    const { onClose } = renderPanel(DEFAULT_SETTINGS, undefined, false);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("SettingsPanel — appearance toggles", () => {
  it("calls onUpdate with showTitles flipped when the Show titles toggle is clicked", () => {
    const { onUpdate } = renderPanel({ ...DEFAULT_SETTINGS, showTitles: true });

    // The show-titles button is the only one using aria-pressed in this panel.
    const toggle = screen.getByRole("button", { pressed: true });
    fireEvent.click(toggle);

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ showTitles: false }));
  });

  it("calls onUpdate with the chosen theme when the Theme select changes", () => {
    const { onUpdate } = renderPanel();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "dark" } });

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ theme: "dark" }));
  });

  it("calls onUpdate with the selected card style when a card style button is clicked", () => {
    const { onUpdate } = renderPanel();

    fireEvent.click(screen.getByText("Glass").closest("button") as HTMLButtonElement);

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ cardStyle: "glass" }));
  });
});

describe("SettingsPanel — itemsPerRow stepper", () => {
  it("increments itemsPerRow when the + stepper button is clicked", () => {
    const { onUpdate } = renderPanel({ ...DEFAULT_SETTINGS, itemsPerRow: 5 });
    fireEvent.click(screen.getByText("Items"));

    // Two + buttons exist: "Add group" and the stepper. The stepper + is last.
    const plusBtns = screen.getAllByText("+");
    fireEvent.click(plusBtns[plusBtns.length - 1]);

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ itemsPerRow: 6 }));
  });

  it("decrements itemsPerRow when the − stepper button is clicked", () => {
    const { onUpdate } = renderPanel({ ...DEFAULT_SETTINGS, itemsPerRow: 5 });
    fireEvent.click(screen.getByText("Items"));

    // Multiple − buttons exist: per-group icon-size control(s) and the stepper.
    // The stepper − is last.
    const minusBtns = screen.getAllByText("−");
    fireEvent.click(minusBtns[minusBtns.length - 1]);

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ itemsPerRow: 4 }));
  });

  it("clamps itemsPerRow to minimum 2 on decrement", () => {
    const { onUpdate } = renderPanel({ ...DEFAULT_SETTINGS, itemsPerRow: 2 });
    fireEvent.click(screen.getByText("Items"));

    const minusBtns = screen.getAllByText("−");
    fireEvent.click(minusBtns[minusBtns.length - 1]);

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ itemsPerRow: 2 }));
  });

  it("clamps itemsPerRow to maximum 10 on increment", () => {
    const { onUpdate } = renderPanel({ ...DEFAULT_SETTINGS, itemsPerRow: 10 });
    fireEvent.click(screen.getByText("Items"));

    const plusBtns = screen.getAllByText("+");
    fireEvent.click(plusBtns[plusBtns.length - 1]);

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ itemsPerRow: 10 }));
  });
});

describe("SettingsPanel — background type selector", () => {
  it("calls onUpdate with the selected background type", () => {
    const { onUpdate } = renderPanel();

    fireEvent.click(screen.getByText("Color"));

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ background: expect.objectContaining({ type: "color" }) }),
    );
  });

  it("renders color picker inputs when background type is color", () => {
    renderPanel({
      ...DEFAULT_SETTINGS,
      background: { ...DEFAULT_SETTINGS.background, type: "color" },
    });

    expect(document.querySelectorAll('input[type="color"]').length).toBeGreaterThan(0);
  });

  it("renders range slider when background type is gradient", () => {
    renderPanel({
      ...DEFAULT_SETTINGS,
      background: { ...DEFAULT_SETTINGS.background, type: "gradient" },
    });

    expect(document.querySelector('input[type="range"]')).toBeTruthy();
  });
});

describe("SettingsPanel — group management", () => {
  it("calls onAddGroup when the Add group button is clicked", () => {
    const { onAddGroup } = renderPanel();
    fireEvent.click(screen.getByText("Items"));

    fireEvent.click(screen.getByTitle("Add group"));

    expect(onAddGroup).toHaveBeenCalledTimes(1);
  });

  it("calls onDeleteGroup with the group id when ✕ is clicked", () => {
    const { onDeleteGroup } = renderPanel(DEFAULT_SETTINGS, [
      { id: "g1", name: "Work", miniIconSize: 16 },
      { id: "g2", name: "Personal", miniIconSize: 16 },
    ]);
    fireEvent.click(screen.getByText("Items"));

    fireEvent.click(screen.getByLabelText("Delete group Work"));

    expect(onDeleteGroup).toHaveBeenCalledWith("g1");
  });

  it("disables the delete button when only one group exists", () => {
    renderPanel(DEFAULT_SETTINGS, [{ id: "g1", name: "Work", miniIconSize: 16 }]);
    fireEvent.click(screen.getByText("Items"));

    const btn = screen.getByLabelText("Delete group Work") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("enables the delete button when multiple groups exist", () => {
    renderPanel(DEFAULT_SETTINGS, [
      { id: "g1", name: "Work", miniIconSize: 16 },
      { id: "g2", name: "Personal", miniIconSize: 16 },
    ]);
    fireEvent.click(screen.getByText("Items"));

    const btn = screen.getByLabelText("Delete group Work") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("calls onSwapGroups(i, i-1) when a group's move-up button is clicked", () => {
    const { onSwapGroups } = renderPanel(DEFAULT_SETTINGS, [
      { id: "g1", name: "Work", miniIconSize: 16 },
      { id: "g2", name: "Personal", miniIconSize: 16 },
    ]);
    fireEvent.click(screen.getByText("Items"));

    fireEvent.click(screen.getByLabelText("Move group Personal up"));

    expect(onSwapGroups).toHaveBeenCalledWith(1, 0);
  });

  it("calls onSwapGroups(i, i+1) when a group's move-down button is clicked", () => {
    const { onSwapGroups } = renderPanel(DEFAULT_SETTINGS, [
      { id: "g1", name: "Work", miniIconSize: 16 },
      { id: "g2", name: "Personal", miniIconSize: 16 },
    ]);
    fireEvent.click(screen.getByText("Items"));

    fireEvent.click(screen.getByLabelText("Move group Work down"));

    expect(onSwapGroups).toHaveBeenCalledWith(0, 1);
  });

  it("calls onChangeIconSize with a decreased size when a group's − icon-size button is clicked", () => {
    const { onChangeIconSize } = renderPanel(DEFAULT_SETTINGS, [
      { id: "g1", name: "Work", miniIconSize: 16 },
    ]);
    fireEvent.click(screen.getByText("Items"));

    fireEvent.click(screen.getByLabelText("Decrease icon size for Work"));

    expect(onChangeIconSize).toHaveBeenCalledWith("g1", 14);
  });

  it("calls onChangeIconSize with an increased size when a group's + icon-size button is clicked", () => {
    const { onChangeIconSize } = renderPanel(DEFAULT_SETTINGS, [
      { id: "g1", name: "Work", miniIconSize: 16 },
    ]);
    fireEvent.click(screen.getByText("Items"));

    fireEvent.click(screen.getByLabelText("Increase icon size for Work"));

    expect(onChangeIconSize).toHaveBeenCalledWith("g1", 18);
  });

  it("disables the icon-size − button at the minimum and + button at the maximum", () => {
    renderPanel(DEFAULT_SETTINGS, [{ id: "g1", name: "Work", miniIconSize: 12 }]);
    fireEvent.click(screen.getByText("Items"));
    expect(
      (screen.getByLabelText("Decrease icon size for Work") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("disables move-up for the first group and move-down for the last group", () => {
    renderPanel(DEFAULT_SETTINGS, [
      { id: "g1", name: "Work", miniIconSize: 16 },
      { id: "g2", name: "Personal", miniIconSize: 16 },
    ]);
    fireEvent.click(screen.getByText("Items"));

    expect((screen.getByLabelText("Move group Work up") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Move group Personal down") as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByLabelText("Move group Work down") as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((screen.getByLabelText("Move group Personal up") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });
});

describe("SettingsPanel — rollback", () => {
  it("does not show Rollback on initial open (no changes yet)", () => {
    renderPanel();
    expect(screen.queryByText("Rollback")).toBeNull();
  });

  it("shows Rollback button when the settings prop differs from the snapshot taken on open", () => {
    // SettingsPanel records oldSettings when `open` is true.
    // Re-rendering with different settings makes hasChanges = true.
    const { rerenderWith } = renderPanel(DEFAULT_SETTINGS);

    rerenderWith({ ...DEFAULT_SETTINGS, theme: "dark" });

    expect(screen.queryByText("Rollback")).toBeTruthy();
  });

  it("calls onUpdate with the original settings when Rollback is clicked", () => {
    const original: Settings = { ...DEFAULT_SETTINGS, theme: "light" };
    const { onUpdate, rerenderWith } = renderPanel(original);

    rerenderWith({ ...original, theme: "dark" });
    fireEvent.click(screen.getByText("Rollback"));

    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ theme: "light" }));
  });
});
