import { getClient } from "./client.ts";
import type { Peer, PeerStatus } from "../types.ts";

export async function registerPeer(scope: string, summary: string | null): Promise<Peer> {
  const client = getClient();

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated. Run `coop login` first.");

  const { data, error } = await client
    .from("peers")
    .upsert({ user_id: user.id, scope, status: "online", summary, last_seen: new Date().toISOString() }, { onConflict: "scope" })
    .select()
    .single();

  if (error) throw new Error(`Failed to register peer: ${error.message}`);
  return data as Peer;
}

export async function updatePeerStatus(scope: string, status: PeerStatus): Promise<void> {
  const { error } = await getClient()
    .from("peers")
    .update({ status, last_seen: new Date().toISOString() })
    .eq("scope", scope);

  if (error) throw new Error(`Failed to update peer status: ${error.message}`);
}

export async function updatePeerSummary(scope: string, summary: string): Promise<void> {
  const { error } = await getClient()
    .from("peers")
    .update({ summary })
    .eq("scope", scope);

  if (error) throw new Error(`Failed to update peer summary: ${error.message}`);
}

export async function heartbeat(scope: string): Promise<void> {
  const { error } = await getClient()
    .from("peers")
    .update({ last_seen: new Date().toISOString() })
    .eq("scope", scope);

  if (error) throw new Error(`Failed to heartbeat: ${error.message}`);
}

// Returns all peers visible to the current user (own + granted)
export async function listPeers(): Promise<Peer[]> {
  const { data, error } = await getClient()
    .from("visible_peers") // RLS view
    .select("*")
    .order("status", { ascending: false })
    .order("last_seen", { ascending: false });

  if (error) throw new Error(`Failed to list peers: ${error.message}`);
  return data as Peer[];
}
