import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAccordions } from "./useAccordions";
import type { AccordionGroup, SpeedDialSlot } from "../types";
import { seedStorage } from "../test/setup";

// ── Test-data helpers ─────────────────────────────────────────────────────

function makeGroup(
  overrides: Partial<AccordionGroup> & { id: string; name: string },
): AccordionGroup {
  return { collapsed: false, items: [], ...overrides };
}

function makeSlot(overrides: Partial<SpeedDialSlot> & { id: string }): SpeedDialSlot {
  return { url: null, title: null, ...overrides };
}

/** Mount the hook and wait for the async initial load to complete. */
async function mountHook() {
  const hook = renderHook(() => useAccordions());
  await act(async () => {});
  return hook;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("useAccordions — initial load", () => {
  it("creates default starter groups on a fresh install", async () => {
    const { result } = await mountHook();

    expect(result.current.groups).toHaveLength(3);
    const names = result.current.groups.map((g) => g.name);
    expect(names).toEqual(["Work", "Personal", "Tools"]);
  });

  it("loads groups previously saved in chrome.storage.local", async () => {
    const saved = [
      makeGroup({ id: "g1", name: "Work" }),
      makeGroup({ id: "g2", name: "Personal" }),
    ];
    seedStorage("local", { accordionGroups: saved });

    const { result } = await mountHook();

    expect(result.current.groups).toHaveLength(2);
    expect(result.current.groups[0].id).toBe("g1");
    expect(result.current.groups[1].id).toBe("g2");
  });

  it("does not truncate or add groups based on any external count", async () => {
    // 5 groups in storage — they should all survive
    const saved = Array.from({ length: 5 }, (_, i) =>
      makeGroup({ id: `g${i}`, name: `Group ${i}` }),
    );
    seedStorage("local", { accordionGroups: saved });

    const { result } = await mountHook();

    expect(result.current.groups).toHaveLength(5);
  });

  it("migrates bookmarks from the legacy flat-grid format", async () => {
    const legacy: SpeedDialSlot[] = [
      { id: "s1", url: "https://a.com", title: "A" },
      { id: "s2", url: null, title: null }, // empty slot — skipped
      { id: "s3", url: "https://b.com", title: "B" },
    ];
    seedStorage("sync", { speedDial: legacy });

    const { result } = await mountHook();

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].name).toBe("Bookmarks");
    expect(result.current.groups[0].items).toHaveLength(2); // empty slot skipped
    expect(result.current.groups[0].items[0].url).toBe("https://a.com");
    expect(result.current.groups[0].items[1].url).toBe("https://b.com");
  });
});

describe("useAccordions — addGroup", () => {
  it("appends a new group at the end", async () => {
    const groups = [makeGroup({ id: "g1", name: "Work" })];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.addGroup();
    });

    expect(result.current.groups).toHaveLength(2);
    expect(result.current.groups[0].id).toBe("g1");
    expect(result.current.groups[1].name).toBe("New");
    expect(result.current.groups[1].items).toHaveLength(0);
  });

  it("persists the new group to chrome.storage.local", async () => {
    const { result } = await mountHook();

    await act(async () => {
      await result.current.addGroup();
    });

    expect(chrome.storage.local.set).toHaveBeenLastCalledWith(
      expect.objectContaining({ accordionGroups: expect.any(Array) }),
    );
  });
});

describe("useAccordions — addItem", () => {
  it("appends a bookmark to the correct group", async () => {
    const groups = [
      makeGroup({ id: "g1", name: "Work" }),
      makeGroup({ id: "g2", name: "Personal" }),
    ];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.addItem("g2", "https://example.com", "Example");
    });

    expect(result.current.groups[0].items).toHaveLength(0); // g1 unchanged
    expect(result.current.groups[1].items).toHaveLength(1);
    expect(result.current.groups[1].items[0].url).toBe("https://example.com");
    expect(result.current.groups[1].items[0].title).toBe("Example");
  });

  it("persists the change to chrome.storage.local", async () => {
    const groups = [makeGroup({ id: "g1", name: "Work" })];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.addItem("g1", "https://a.com", "A");
    });

    expect(chrome.storage.local.set).toHaveBeenLastCalledWith(
      expect.objectContaining({ accordionGroups: expect.any(Array) }),
    );
  });
});

describe("useAccordions — removeItem", () => {
  it("removes the bookmark at the given index", async () => {
    const slotA = makeSlot({ id: "s1", url: "https://a.com", title: "A" });
    const slotB = makeSlot({ id: "s2", url: "https://b.com", title: "B" });
    const groups = [makeGroup({ id: "g1", name: "Work", items: [slotA, slotB] })];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.removeItem("g1", 0);
    });

    expect(result.current.groups[0].items).toHaveLength(1);
    expect(result.current.groups[0].items[0].id).toBe("s2");
  });

  it("leaves other groups untouched", async () => {
    const slot = makeSlot({ id: "s1", url: "https://a.com", title: "A" });
    const groups = [
      makeGroup({ id: "g1", name: "Work", items: [slot] }),
      makeGroup({ id: "g2", name: "Personal" }),
    ];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.removeItem("g1", 0);
    });

    expect(result.current.groups[1].items).toHaveLength(0);
  });
});

describe("useAccordions — moveItem", () => {
  it("swaps two cards within the same group", async () => {
    const slotA = makeSlot({ id: "s1", url: "https://a.com", title: "A" });
    const slotB = makeSlot({ id: "s2", url: "https://b.com", title: "B" });
    const groups = [makeGroup({ id: "g1", name: "Work", items: [slotA, slotB] })];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.moveItem("g1", 0, "g1", 1);
    });

    const items = result.current.groups[0].items;
    expect(items[0].id).toBe("s2");
    expect(items[1].id).toBe("s1");
  });

  it("moves a card from one group to another", async () => {
    const slot = makeSlot({ id: "s1", url: "https://a.com", title: "A" });
    const groups = [
      makeGroup({ id: "g1", name: "Work", items: [slot] }),
      makeGroup({ id: "g2", name: "Personal", items: [] }),
    ];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.moveItem("g1", 0, "g2", 0);
    });

    expect(result.current.groups[0].items).toHaveLength(0);
    expect(result.current.groups[1].items).toHaveLength(1);
    expect(result.current.groups[1].items[0].id).toBe("s1");
  });

  it("is a no-op when source and target position are the same", async () => {
    const slot = makeSlot({ id: "s1", url: "https://a.com", title: "A" });
    const groups = [makeGroup({ id: "g1", name: "Work", items: [slot] })];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();
    const setCallsBefore = (chrome.storage.local.set as ReturnType<typeof import("vitest").vi.fn>)
      .mock.calls.length;

    await act(async () => {
      await result.current.moveItem("g1", 0, "g1", 0);
    });

    const setCallsAfter = (chrome.storage.local.set as ReturnType<typeof import("vitest").vi.fn>)
      .mock.calls.length;
    expect(setCallsAfter).toBe(setCallsBefore); // no extra persist call
  });

  it("is a no-op when a group ID is not found", async () => {
    const slot = makeSlot({ id: "s1", url: "https://a.com", title: "A" });
    const groups = [makeGroup({ id: "g1", name: "Work", items: [slot] })];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.moveItem("g1", 0, "nonexistent", 0);
    });

    // Card stays in g1.
    expect(result.current.groups[0].items).toHaveLength(1);
  });
});

describe("useAccordions — renameGroup", () => {
  it("renames the group and trims whitespace", async () => {
    const groups = [makeGroup({ id: "g1", name: "Old" })];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.renameGroup("g1", "  New Name  ");
    });

    expect(result.current.groups[0].name).toBe("New Name");
  });

  it("falls back to 'New' when an empty string is provided", async () => {
    const groups = [makeGroup({ id: "g1", name: "Work" })];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.renameGroup("g1", "   ");
    });

    expect(result.current.groups[0].name).toBe("New");
  });
});

describe("useAccordions — toggleCollapse", () => {
  it("toggles the collapsed state of a group", async () => {
    const groups = [makeGroup({ id: "g1", name: "Work", collapsed: false })];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.toggleCollapse("g1");
    });
    expect(result.current.groups[0].collapsed).toBe(true);

    await act(async () => {
      await result.current.toggleCollapse("g1");
    });
    expect(result.current.groups[0].collapsed).toBe(false);
  });
});

describe("useAccordions — swapGroups", () => {
  it("swaps two groups by index", async () => {
    const groups = [
      makeGroup({ id: "g1", name: "First" }),
      makeGroup({ id: "g2", name: "Second" }),
    ];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.swapGroups(0, 1);
    });

    expect(result.current.groups[0].name).toBe("Second");
    expect(result.current.groups[1].name).toBe("First");
  });

  it("is a no-op when both indices are the same", async () => {
    const groups = [makeGroup({ id: "g1", name: "Work" })];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();
    const setCallsBefore = (chrome.storage.local.set as ReturnType<typeof import("vitest").vi.fn>)
      .mock.calls.length;

    await act(async () => {
      await result.current.swapGroups(0, 0);
    });

    const setCallsAfter = (chrome.storage.local.set as ReturnType<typeof import("vitest").vi.fn>)
      .mock.calls.length;
    expect(setCallsAfter).toBe(setCallsBefore);
  });
});

describe("useAccordions — deleteGroup", () => {
  it("removes the group and all its items", async () => {
    const slot = makeSlot({ id: "s1", url: "https://a.com", title: "A" });
    const groups = [
      makeGroup({ id: "g1", name: "Work", items: [slot] }),
      makeGroup({ id: "g2", name: "Personal" }),
    ];
    seedStorage("local", { accordionGroups: groups });

    const { result } = await mountHook();

    await act(async () => {
      await result.current.deleteGroup("g1");
    });

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].id).toBe("g2");
  });
});
