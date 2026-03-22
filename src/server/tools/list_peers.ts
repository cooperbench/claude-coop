import { listPeers } from "../../db/peers.ts";

export const listPeersTool = {
  name: "list_peers",
  description: "List all visible Claude Code sessions (your own + any you've been granted access to).",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
  async handler(): Promise<string> {
    const peers = await listPeers();
    if (peers.length === 0) return "No peers found.";

    return peers
      .map((p) => {
        const status = p.status === "online" ? "online" : "offline";
        return `${p.scope} [${status}]${p.summary ? ` — ${p.summary}` : ""}`;
      })
      .join("\n");
  },
};
