import { execSync } from "child_process";

function gitOutput(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

export function generateSummary(): string {
  const status = gitOutput("git status --porcelain");
  if (!status) return "clean";

  const lines = status.split("\n").filter(Boolean);
  const modified = lines.filter((l) => l.startsWith(" M") || l.startsWith("M")).length;
  const untracked = lines.filter((l) => l.startsWith("??")).length;
  const added = lines.filter((l) => l.startsWith("A")).length;

  const parts: string[] = [];
  if (modified) parts.push(`${modified} modified`);
  if (added) parts.push(`${added} added`);
  if (untracked) parts.push(`${untracked} untracked`);

  return parts.join(", ") || "clean";
}
