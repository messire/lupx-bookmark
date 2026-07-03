import { describe, it, expect } from "vitest";
import { getFaviconFallbackUrl, getDirectFaviconUrls } from "./favicon";

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

describe("getDirectFaviconUrls", () => {
  it("returns every well-known variant, in probing order, at the page's origin", () => {
    const result = getDirectFaviconUrls("https://example.com/some/page?q=1");
    expect(result).toEqual([
      "https://example.com/favicon.ico",
      "https://example.com/favicon.png",
      "https://example.com/favicon.svg",
      "https://example.com/apple-touch-icon.png",
      "https://example.com/apple-touch-icon-precomposed.png",
      "https://example.com/icon.png",
      "https://example.com/icon.svg",
    ]);
  });

  it("strips the path - uses origin only", () => {
    const result = getDirectFaviconUrls("https://github.com/user/repo");
    expect(result[0]).toBe("https://github.com/favicon.ico");
    expect(result.every((u) => u.startsWith("https://github.com/"))).toBe(true);
  });

  it("returns an empty array for an invalid URL", () => {
    expect(getDirectFaviconUrls("not-a-url")).toEqual([]);
  });
});
