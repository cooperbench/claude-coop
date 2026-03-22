import { listPeers } from "../../db/peers.ts";

export async function list(): Promise<void> {
  const peers = await listPeers();

  if (peers.length === 0) {
    console.log("No peers found.");
    return;
  }

  for (const peer of peers) {
    const status = peer.status === "online" ? "●" : "○";
    const summary = peer.summary ? `  ${peer.summary}` : "";
    console.log(`${status} ${peer.scope}${summary}`);
  }
}
