import { z } from "zod";
import { getInbox, markRead } from "../../db/messages.ts";

export const checkInboxTool = {
  name: "check_inbox",
  description: "Fetch unread messages in your inbox.",
  inputSchema: {
    type: "object" as const,
    properties: {
      unread_only: { type: "boolean", description: "Only return unread messages (default: true)" },
    },
  },
  schema: z.object({ unread_only: z.boolean().default(true) }),
  async handler(args: { unread_only: boolean }, scope: string): Promise<string> {
    const messages = await getInbox(scope, args.unread_only);

    if (messages.length === 0) return "No messages.";

    const unreadIds = messages.filter((m) => !m.read).map((m) => m.id);
    if (unreadIds.length > 0) await markRead(unreadIds);

    return messages
      .map((m) => {
        const time = new Date(m.created_at).toLocaleString();
        return `[${time}] from ${m.from_scope}:\n${m.body}`;
      })
      .join("\n\n");
  },
};
