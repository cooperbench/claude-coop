import { sendMessage } from "../../db/messages.ts";
import { deriveScope } from "../../session/scope.ts";

export async function send(toScope: string, body: string): Promise<void> {
  const scope = deriveScope();
  const msg = await sendMessage(scope.full, toScope, body);
  console.log(`Sent to ${toScope} [${msg.id}]`);
}
