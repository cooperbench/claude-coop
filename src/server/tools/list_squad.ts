import { listSquad } from "../../db/squad.ts";
import { listActiveThreads } from "../../db/messages.ts";

export const listSquadTool = {
  name: "list_squad",
  description: "List all visible Claude Code sessions (your own + any you've been granted access to), plus active threads.",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
  async handler(currentScope: string): Promise<string> {
    const [members, threads] = await Promise.all([listSquad(), listActiveThreads(currentScope)]);

    if (members.length === 0) return "No squad members found.";

    const squadLines = members.map((m) => {
      const status = m.status === "online" ? "online" : "offline";
      const you = m.scope === currentScope ? " (you)" : "";
      return `${m.scope} [${status}]${you}${m.summary ? ` — ${m.summary}` : ""}`;
    });

    const parts = [`squad:\n${squadLines.join("\n")}`];

    if (threads.length > 0) {
      const threadLines = threads.map((t) => `  ${t.thread} — ${t.participants.join(", ") || "(just you)"}`);
      parts.push(`threads:\n${threadLines.join("\n")}`);
    }

    return parts.join("\n\n");
  },
};
