import { describe, it, expect } from "bun:test";
import { formatTime } from "../../src/cli/commands/inbox.ts";

describe("formatTime", () => {
  it("returns 'just now' for less than 1 minute ago", () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    expect(formatTime(recent)).toBe("just now");
  });

  it("returns minutes ago for less than 1 hour", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago for less than 24 hours", () => {
    const threeHrsAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    expect(formatTime(threeHrsAgo)).toBe("3h ago");
  });

  it("returns a date string for older than 24 hours", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
    const result = formatTime(twoDaysAgo);
    // Should be a locale date string, not a relative time
    expect(result).not.toContain("ago");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns '1m ago' for exactly 60 seconds ago", () => {
    const sixtySecAgo = new Date(Date.now() - 60_000).toISOString();
    expect(formatTime(sixtySecAgo)).toBe("1m ago");
  });
});
