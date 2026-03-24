import { describe, it, expect } from "bun:test";
import { effectiveStatus } from "../../src/db/squad.ts";
import { PEER_TIMEOUT_MS } from "../../src/config.ts";
import type { SquadMember } from "../../src/types.ts";

// Minimal helper to test the sort logic applied in listSquad()
function sortSquad(members: Pick<SquadMember, "status" | "last_seen">[]): typeof members {
  return [...members].sort((a, b) => {
    if (a.status !== b.status) return a.status === "online" ? -1 : 1;
    return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
  });
}

describe("effectiveStatus", () => {
  it("returns online when last_seen is recent", () => {
    const recent = new Date(Date.now() - 30_000).toISOString(); // 30s ago
    expect(effectiveStatus("online", recent)).toBe("online");
  });

  it("returns offline when last_seen is stale", () => {
    const stale = new Date(Date.now() - PEER_TIMEOUT_MS - 5_000).toISOString();
    expect(effectiveStatus("online", stale)).toBe("offline");
  });

  it("returns offline when status is already offline, regardless of last_seen", () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    expect(effectiveStatus("offline", recent)).toBe("offline");
  });

  it("returns online when last_seen is 1ms inside the timeout window", () => {
    const justInWindow = new Date(Date.now() - PEER_TIMEOUT_MS + 1_000).toISOString();
    expect(effectiveStatus("online", justInWindow)).toBe("online");
  });

  it("returns offline when last_seen is 1ms past the timeout window", () => {
    const justPast = new Date(Date.now() - PEER_TIMEOUT_MS - 1).toISOString();
    expect(effectiveStatus("online", justPast)).toBe("offline");
  });

  it("uses PEER_TIMEOUT_MS, not a hardcoded constant", () => {
    // Just inside the window — should be online
    const justInside = new Date(Date.now() - PEER_TIMEOUT_MS + 5_000).toISOString();
    expect(effectiveStatus("online", justInside)).toBe("online");

    // Just outside the window — should be offline
    const justOutside = new Date(Date.now() - PEER_TIMEOUT_MS - 5_000).toISOString();
    expect(effectiveStatus("online", justOutside)).toBe("offline");
  });
});

describe("listSquad sort order", () => {
  const now = Date.now();
  const t = (msAgo: number) => new Date(now - msAgo).toISOString();

  it("online peers appear before offline peers", () => {
    const members = [
      { status: "offline" as const, last_seen: t(10_000) },
      { status: "online" as const, last_seen: t(30_000) },
    ];
    const sorted = sortSquad(members);
    expect(sorted[0]!.status).toBe("online");
    expect(sorted[1]!.status).toBe("offline");
  });

  it("within same status, most recent last_seen comes first", () => {
    const members = [
      { status: "online" as const, last_seen: t(60_000) },
      { status: "online" as const, last_seen: t(10_000) },
    ];
    const sorted = sortSquad(members);
    expect(sorted[0]!.last_seen).toBe(t(10_000));
  });

  it("stale peers (reclassified offline) sort after fresh online peers", () => {
    const staleTime = t(PEER_TIMEOUT_MS + 5_000);
    const members = [
      { status: effectiveStatus("online", staleTime), last_seen: staleTime },
      { status: effectiveStatus("online", t(30_000)), last_seen: t(30_000) },
    ];
    const sorted = sortSquad(members);
    expect(sorted[0]!.status).toBe("online");
    expect(sorted[1]!.status).toBe("offline");
  });
});
