import { describe, it, expect, spyOn, mock } from "bun:test";
import { parseRepoName } from "../../src/session/scope.ts";

describe("parseRepoName", () => {
  it("parses SSH remote URL", () => {
    expect(parseRepoName("git@github.com:org/repo.git")).toBe("repo");
  });

  it("parses HTTPS remote URL", () => {
    expect(parseRepoName("https://github.com/org/repo.git")).toBe("repo");
  });

  it("parses HTTPS remote URL without .git suffix", () => {
    expect(parseRepoName("https://github.com/org/repo")).toBe("repo");
  });

  it("parses SSH remote URL without .git suffix", () => {
    expect(parseRepoName("git@github.com:org/repo")).toBe("repo");
  });

  it("returns just the repo name, not the org", () => {
    expect(parseRepoName("https://github.com/myorg/myrepo.git")).toBe("myrepo");
  });

  it("handles hyphenated repo names", () => {
    expect(parseRepoName("git@github.com:org/my-cool-repo.git")).toBe("my-cool-repo");
  });
});

describe("deriveScope warnings", () => {
  it("writes to stderr when username is unknown", async () => {
    // Spy on stderr before importing so we can capture the warning
    const stderrSpy = spyOn(process.stderr, "write").mockImplementation(() => true);

    // Re-import with mocked fs to simulate missing auth file
    mock.module("fs", () => ({
      readFileSync: () => { throw new Error("no auth file"); },
    }));

    // Dynamic import ensures fresh module evaluation with the mock
    const { deriveScope } = await import("../../src/session/scope.ts?nocache=" + Date.now());
    deriveScope();

    const warnedAboutUsername = stderrSpy.mock.calls.some(
      (args) => String(args[0]).includes("run `claude-coop login`")
    );
    expect(warnedAboutUsername).toBe(true);

    stderrSpy.mockRestore();
    mock.restore();
  });
});
