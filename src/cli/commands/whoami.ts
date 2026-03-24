import { deriveScope } from "../../session/scope.ts";
import { getClient } from "../../db/client.ts";

export async function whoami(): Promise<void> {
  const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
  const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
  const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

  const { data: { user } } = await getClient().auth.getUser();

  if (!user) {
    console.log(`  ${red("✗")} Not logged in — run \`claude-coop login\``);
    process.exit(1);
  }

  const scope = deriveScope();
  const username = user.user_metadata.user_name as string;

  console.log(`  ${green("✓")} Logged in as ${username}`);
  console.log(`  ${dim("scope:")}  ${scope.full}`);
}
