import { z } from "zod";
import { sendMessage } from "../../db/messages.ts";

export const sendMessageTool = {
  name: "send_message",
  description: "Send a message to another Claude Code session by scope. The message persists if the peer is offline and will be delivered when they next start.",
  inputSchema: {
    type: "object" as const,
    properties: {
      to_scope: { type: "string", description: "Target scope, e.g. 'hao/their-repo:main' or 'arpan/*'" },
      body: { type: "string", description: "Message content" },
    },
    required: ["to_scope", "body"],
  },
  schema: z.object({ to_scope: z.string(), body: z.string() }),
  async handler(args: { to_scope: string; body: string }, fromScope: string): Promise<string> {
    const msg = await sendMessage(fromScope, args.to_scope, args.body);
    return `Message sent to ${args.to_scope} [id: ${msg.id}]`;
  },
};
