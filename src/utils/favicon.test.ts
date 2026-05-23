import { describe, it, expect } from "vitest";
import { getFaviconUrl, getFaviconDDGUrl, getFaviconFallbackUrl } from "./favicon";

const CHROME_FAVICON = "chrome://favicon2/";
const DDG = "https://icons.duckduckgo.com/ip3/";
const S2 = "https://www.google.com/s2/favicons";

describe("getFaviconUrl (chrome://favicon2/)", () => {
  it("returns a chrome://favicon2/ URL for a valid URL", () => {
    const result = getFaviconUrl("https://example.com", 32);
    expect(result).toContain(CHROME_FAVICON);
    expect(result).toContain("size=32");
    expect(result).toContain(encodeURIComponent("https://example.com"));
  });

  it("includes the page_url param", () => {
    const result = getFaviconUrl("https://github.com/user/repo?q=1", 16);
    expect(result).toContain("page_url=");
    expect(result).toContain(encodeURIComponent("https://github.com/user/repo?q=1"));
  });

  it("works with all supported sizes", () => {
    expect(getFaviconUrl("https://example.com", 16)).toContain("size=16");
    expect(getFaviconUrl("https://example.com", 32)).toContain("size=32");
    expect(getFaviconUrl("https://example.com", 64)).toContain("size=64");
  });

  it("defaults to size 32 when no size is provided", () => {
    expect(getFaviconUrl("https://example.com")).toContain("size=32");
  });
});

describe("getFaviconDDGUrl (DuckDuckGo)", () => {
  it("returns a DuckDuckGo URL with the hostname", () => {
    const result = getFaviconDDGUrl("https://rutracker.org/forum/index.php");
    expect(result).toBe(DDG + "rutracker.org.ico");
  });

  it("strips path and uses hostname only", () => {
    const result = getFaviconDDGUrl("https://github.com/user/repo?q=1");
    expect(result).toBe(DDG + "github.com.ico");
  });

  it("works with subdomains", () => {
    expect(getFaviconDDGUrl("https://mail.google.com/")).toBe(DDG + "mail.google.com.ico");
  });

  it("returns an empty string for an invalid URL", () => {
    expect(getFaviconDDGUrl("not-a-url")).toBe("");
  });
});

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
