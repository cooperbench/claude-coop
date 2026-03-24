import { getInbox, markRead } from "../../db/messages.ts";
import { deriveScope } from "../../session/scope.ts";

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString();
}

export async function inbox({ all }: { all: boolean }): Promise<void> {
  const scope = deriveScope();
  const messages = await getInbox(scope.full, !all);

  if (messages.length === 0) {
    console.log(dim(all ? "Nothing here yet." : "You're all caught up!"));
    return;
  }

  const unread = messages.filter((m) => !m.read);
  const toMarkRead = unread.map((m) => m.id);

  for (const msg of messages) {
    const threadTag = msg.thread ? dim(` [${msg.thread}]`) : "";
    const readMark = msg.read ? dim("  ") : "• ";
    const time = dim(formatTime(msg.created_at));
    console.log(`${readMark}${bold(msg.from_scope)}${threadTag}  ${time}`);
    console.log(`  ${msg.body}`);
    console.log();
  }

  if (toMarkRead.length > 0) {
    await markRead(toMarkRead);
  }
}
