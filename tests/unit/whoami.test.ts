import { describe, it, expect } from "bun:test";
import { parseRepoName } from "../../src/session/scope.ts";

/**
 * whoami output is: "username" + scope "username/repo@machine"
 * The scope format is the contract — test it explicitly.
 */
describe("whoami scope format", () => {
  it("scope full string follows username/repo@machine pattern", () => {
    // Simulate what deriveScope() produces
    const username = "arpan";
    const repo = parseRepoName("git@github.com:org/myrepo.git");
    const machine = "macbook";
    const full = `${username}/${repo}@${machine}`;

    expect(full).toBe("arpan/myrepo@macbook");
    expect(full).toMatch(/^[^/]+\/[^@]+@.+$/);
  });

  it("scope with HTTPS remote produces correct format", () => {
    const repo = parseRepoName("https://github.com/cooperbench/claude-coop.git");
    const full = `akhatua2/${repo}@arpanet-2`;
    expect(full).toBe("akhatua2/claude-coop@arpanet-2");
  });
});
