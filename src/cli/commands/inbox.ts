import { getInbox, markRead } from "../../db/messages.ts";
import { deriveScope } from "../../session/scope.ts";

export async function inbox(options: { unread: boolean }): Promise<void> {
  const scope = deriveScope();
  const messages = await getInbox(scope.full, options.unread);

  if (messages.length === 0) {
    console.log("No messages.");
    return;
  }

  for (const msg of messages) {
    const read = msg.read ? " " : "*";
    const time = new Date(msg.created_at).toLocaleString();
    console.log(`[${read}] ${msg.from_scope}  ${time}`);
    console.log(`    ${msg.body}`);
    console.log();
  }

  const unreadIds = messages.filter((m) => !m.read).map((m) => m.id);
  if (unreadIds.length > 0) await markRead(unreadIds);
}
