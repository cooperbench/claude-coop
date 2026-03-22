import { getClient } from "./client.ts";
import type { Message } from "../types.ts";

export async function sendMessage(fromScope: string, toScope: string, body: string): Promise<Message> {
  const { data, error } = await getClient()
    .from("messages")
    .insert({ from_scope: fromScope, to_scope: toScope, body })
    .select()
    .single();

  if (error) throw new Error(`Failed to send message: ${error.message}`);
  return data as Message;
}

export async function getInbox(scope: string, unreadOnly = false): Promise<Message[]> {
  let query = getClient()
    .from("messages")
    .select("*")
    .eq("to_scope", scope)
    .order("created_at", { ascending: true });

  if (unreadOnly) query = query.eq("read", false);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch inbox: ${error.message}`);
  return data as Message[];
}

export async function markRead(messageIds: string[]): Promise<void> {
  const { error } = await getClient()
    .from("messages")
    .update({ read: true })
    .in("id", messageIds);

  if (error) throw new Error(`Failed to mark messages read: ${error.message}`);
}
