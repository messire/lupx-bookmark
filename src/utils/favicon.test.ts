import { describe, it, expect } from "vitest";
import { getFaviconUrl } from "./favicon";

const S2 = "https://www.google.com/s2/favicons";

describe("getFaviconUrl", () => {
  it("returns a Google S2 URL for a valid URL", () => {
    const result = getFaviconUrl("https://example.com", 32);
    expect(result).toBe(`${S2}?domain=https://example.com&sz=32`);
  });

  it("strips the path — uses origin only", () => {
    const result = getFaviconUrl("https://github.com/user/repo?q=1", 16);
    expect(result).toBe(`${S2}?domain=https://github.com&sz=16`);
  });

  it("works for URLs with subdomains", () => {
    const result = getFaviconUrl("https://mail.google.com/mail/u/0/", 64);
    expect(result).toBe(`${S2}?domain=https://mail.google.com&sz=64`);
  });

  it("defaults to size 32 when no size is provided", () => {
    const result = getFaviconUrl("https://example.com");
    expect(result).toContain("sz=32");
  });

  it("returns an empty string for an invalid URL", () => {
    expect(getFaviconUrl("not-a-url")).toBe("");
  });

  it("returns an empty string for an empty string", () => {
    expect(getFaviconUrl("")).toBe("");
  });

  it("handles http (non-https) URLs", () => {
    const result = getFaviconUrl("http://example.com/page");
    expect(result).toBe(`${S2}?domain=http://example.com&sz=32`);
  });
});
