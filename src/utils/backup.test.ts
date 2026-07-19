import { describe, it, expect } from "vitest";
import { parseBackupFile, mergeSettings, mergeGroups } from "./backup";
import { DEFAULT_SETTINGS } from "../types";
import type { AccordionGroup, Settings } from "../types";

function makeFile(content: unknown): File {
  return new File([JSON.stringify(content)], "backup.json", { type: "application/json" });
}

function makeGroup(overrides: Partial<AccordionGroup> = {}): AccordionGroup {
  return {
    id: "g1",
    name: "Work",
    collapsed: false,
    miniIconSize: 16,
    items: [],
    ...overrides,
  };
}

describe("parseBackupFile", () => {
  it("parses a well-formed backup", async () => {
    const file = makeFile({
      __version: 1,
      settings: { ...DEFAULT_SETTINGS, theme: "dark" },
      groups: [makeGroup({ items: [{ id: "i1", url: "https://a.com", title: "A" }] })],
    });

    const result = await parseBackupFile(file);

    expect(result.settings.theme).toBe("dark");
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].items).toEqual([{ id: "i1", url: "https://a.com", title: "A" }]);
  });

  it("fills in missing settings keys with defaults", async () => {
    const file = makeFile({ settings: { theme: "dark" }, groups: [] });

    const result = await parseBackupFile(file);

    expect(result.settings).toEqual({ ...DEFAULT_SETTINGS, theme: "dark" });
  });

  it("regenerates missing ids for groups and items", async () => {
    const file = makeFile({
      settings: DEFAULT_SETTINGS,
      groups: [{ name: "Work", items: [{ url: "https://a.com", title: "A" }] }],
    });

    const result = await parseBackupFile(file);

    expect(result.groups[0].id).toBeTruthy();
    expect(result.groups[0].items[0].id).toBeTruthy();
  });

  it("rejects invalid JSON", async () => {
    const file = new File(["not json"], "backup.json", { type: "application/json" });
    await expect(parseBackupFile(file)).rejects.toThrow(/valid JSON/);
  });

  it("rejects a file missing settings", async () => {
    const file = makeFile({ groups: [] });
    await expect(parseBackupFile(file)).rejects.toThrow(/settings/);
  });

  it("rejects a file with a malformed group list", async () => {
    const file = makeFile({ settings: DEFAULT_SETTINGS, groups: [{ name: "Work" }] });
    await expect(parseBackupFile(file)).rejects.toThrow(/invalid group/);
  });
});

describe("mergeSettings", () => {
  it("overlays incoming values on top of current", () => {
    const current: Settings = { ...DEFAULT_SETTINGS, itemsPerRow: 4 };
    const incoming: Settings = { ...DEFAULT_SETTINGS, theme: "dark" };

    const result = mergeSettings(current, incoming);

    expect(result.itemsPerRow).toBe(DEFAULT_SETTINGS.itemsPerRow);
    expect(result.theme).toBe("dark");
  });

  it("deep-merges the background gradient block", () => {
    const current: Settings = {
      ...DEFAULT_SETTINGS,
      background: {
        ...DEFAULT_SETTINGS.background,
        gradient: { from: "#111111", to: "#222222", angle: 90 },
      },
    };
    const incoming: Settings = {
      ...DEFAULT_SETTINGS,
      background: {
        ...DEFAULT_SETTINGS.background,
        gradient: { from: "#333333", to: "#222222", angle: 90 },
      },
    };

    const result = mergeSettings(current, incoming);

    expect(result.background.gradient.from).toBe("#333333");
  });
});

describe("mergeGroups", () => {
  it("appends items from an incoming group with a matching name", () => {
    const current = [makeGroup({ items: [{ id: "i1", url: "https://a.com", title: "A" }] })];
    const incoming = [
      makeGroup({ id: "other-id", items: [{ id: "i2", url: "https://b.com", title: "B" }] }),
    ];

    const result = mergeGroups(current, incoming);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
    expect(result[0].items.map((i) => i.url)).toEqual(["https://a.com", "https://b.com"]);
  });

  it("matches group names case-insensitively", () => {
    const current = [makeGroup({ name: "work" })];
    const incoming = [
      makeGroup({ name: "WORK", items: [{ id: "i2", url: "https://b.com", title: "B" }] }),
    ];

    const result = mergeGroups(current, incoming);

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(1);
  });

  it("skips duplicate URLs within a matched group", () => {
    const current = [makeGroup({ items: [{ id: "i1", url: "https://a.com", title: "A" }] })];
    const incoming = [makeGroup({ items: [{ id: "i2", url: "https://a.com", title: "A dup" }] })];

    const result = mergeGroups(current, incoming);

    expect(result[0].items).toHaveLength(1);
  });

  it("adds unmatched incoming groups as new groups with regenerated ids", () => {
    const current = [makeGroup({ id: "g1", name: "Work" })];
    const incoming = [makeGroup({ id: "g1", name: "Personal" })];

    const result = mergeGroups(current, incoming);

    expect(result).toHaveLength(2);
    expect(result[1].name).toBe("Personal");
    expect(result[1].id).not.toBe("g1");
  });

  it("does not mutate the current groups array", () => {
    const current = [makeGroup({ items: [{ id: "i1", url: "https://a.com", title: "A" }] })];
    const incoming = [makeGroup({ items: [{ id: "i2", url: "https://b.com", title: "B" }] })];

    mergeGroups(current, incoming);

    expect(current[0].items).toHaveLength(1);
  });
});
