import { sendMessage, upsertThreadMembers, getThreadMembers } from "../../db/messages.ts";
import { getSquadMemberStatus } from "../../db/squad.ts";

export const sendMessageTool = {
  name: "send_message",
  description: `Send a message to one or more Claude Code sessions.

Three usage patterns:
1. Direct: send to specific scope(s) — pass "to" with a scope or array of scopes
2. Start a thread: pass "to" + "thread" to tag the conversation with a name
3. Reply to thread: pass only "thread" (no "to") to send to all existing thread participants`,
  inputSchema: {
    type: "object" as const,
    properties: {
      to: {
        oneOf: [
          { type: "string", description: "Single target scope, e.g. 'arpan/coop@macbook'" },
          { type: "array", items: { type: "string" }, description: "Multiple target scopes" },
        ],
        description: "Target scope(s). Omit when replying to an existing thread.",
      },
      body: { type: "string", description: "Message content" },
      thread: {
        type: "string",
        description: "Thread name. Pass with 'to' to start/add to a thread. Pass without 'to' to reply to all existing thread participants.",
      },
      add: {
        type: "array",
        items: { type: "string" },
        description: "Add new scope(s) to an existing thread. Use with 'thread'. The message is sent to existing participants + the new ones.",
      },
    },
    required: ["body"],
  },
  async handler(args: { to?: string | string[]; body: string; thread?: string; add?: string[] }, fromScope: string): Promise<string> {
    let scopes: string[];

    if (args.thread) {
      if (args.to !== undefined) {
        // Starting or explicitly sending to a thread — register everyone as members
        const toList = Array.isArray(args.to) ? args.to : [args.to];
        const allMembers = [...new Set([fromScope, ...toList, ...(args.add ?? [])])];
        await upsertThreadMembers(args.thread, allMembers, fromScope);
        scopes = [...new Set([...toList, ...(args.add ?? [])])];
      } else {
        // Replying to thread — resolve members from DB
        const existing = await getThreadMembers(args.thread, fromScope);
        if (existing.length === 0) return `Thread "${args.thread}" not found or you are not a member`;
        if (args.add?.length) {
          await upsertThreadMembers(args.thread, args.add, fromScope);
          scopes = [...new Set([...existing, ...args.add])];
        } else {
          scopes = existing;
        }
      }
    } else {
      scopes = Array.isArray(args.to) ? args.to! : [args.to!];
    }

    const results: string[] = [];
    for (const scope of scopes) {
      const status = await getSquadMemberStatus(scope);
      if (status === null) {
        results.push(`${scope}: not found — they may need to grant you access first`);
      } else if (status === "offline") {
        results.push(`${scope}: offline`);
      } else {
        await sendMessage(fromScope, scope, args.body, args.thread);
        results.push(`${scope}: sent`);
      }
    }

    return results.join("\n");
  },
};
