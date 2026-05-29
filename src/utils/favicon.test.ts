import { describe, it, expect } from "vitest";
import { getFaviconFallbackUrl } from "./favicon";

const S2 = "https://www.google.com/s2/favicons";

describe("getFaviconFallbackUrl (Google S2)", () => {
  it("returns a Google S2 URL for a valid URL", () => {
    const result = getFaviconFallbackUrl("https://example.com", 32);
    expect(result).toBe(S2 + "?domain=https://example.com&sz=32");
  });

  it("strips the path - uses origin only", () => {
    const result = getFaviconFallbackUrl("https://github.com/user/repo?q=1", 16);
    expect(result).toBe(S2 + "?domain=https://github.com&sz=16");
  });

  it("defaults to size 32 when no size is provided", () => {
    expect(getFaviconFallbackUrl("https://example.com")).toContain("sz=32");
  });

  it("returns an empty string for an invalid URL", () => {
    expect(getFaviconFallbackUrl("not-a-url")).toBe("");
  });

  it("handles http (non-https) URLs", () => {
    const result = getFaviconFallbackUrl("http://example.com/page");
    expect(result).toBe(S2 + "?domain=http://example.com&sz=32");
  });
});
