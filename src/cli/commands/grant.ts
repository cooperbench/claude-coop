import { grantAccess, revokeAccess, listGrants, checkUserExists, type GrantDisplay } from "../../db/grants.ts";

/** Pure diff — exported for testing. */
export function diffGrants(
  selected: string[],
  currentGrants: GrantDisplay[],
  grantee: string,
): { toGrant: string[]; toRevoke: string[] } {
  const alreadyGranted = new Set(
    currentGrants.filter((g) => g.grantee_username === grantee).map((g) => g.scope_pattern)
  );
  const selectedSet = new Set(selected);
  return {
    toGrant: selected.filter((s) => !alreadyGranted.has(s)),
    toRevoke: [...alreadyGranted].filter((s) => !selectedSet.has(s)),
  };
}
import { listOwnScopes } from "../../db/squad.ts";
import { checkbox } from "../prompts/checkbox.ts";
import { getClient } from "../../db/client.ts";

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`;

export async function grant(grantee: string, scopePattern?: string): Promise<void> {
  if (!await checkUserExists(grantee)) {
    console.error(`  ${red("✗")} Couldn't find "${grantee}" — double-check the username.`);
    process.exit(1);
  }

  // Fast path: scope provided directly
  if (scopePattern) {
    await grantAccess(grantee, scopePattern);
    console.log(`  ${green("✓")} Granted ${grantee} access to ${scopePattern}`);
    return;
  }

  // Interactive path
  const { data: { user } } = await getClient().auth.getUser();
  if (!user) {
    console.error(`  ${red("✗")} You're not logged in — run \`claude-coop login\` to get started.`);
    process.exit(1);
  }
  const username = user.user_metadata.user_name as string;

  const [ownScopes, currentGrants] = await Promise.all([
    listOwnScopes(),
    listGrants(),
  ]);

  if (ownScopes.length === 0) {
    console.log(dim("  No active sessions yet — fire up Claude Code first!"));
    return;
  }

  const alreadyGranted = new Set(
    currentGrants.filter((g) => g.grantee_username === grantee).map((g) => g.scope_pattern)
  );

  const items = [
    ...ownScopes.map((m) => ({
      label: m.scope,
      value: m.scope,
      checked: alreadyGranted.has(m.scope),
    })),
    {
      label: `${username}/*  ${dim("(all scopes)")}`,
      value: `${username}/*`,
      checked: alreadyGranted.has(`${username}/*`),
      dividerBefore: true,
    },
  ];

  console.log();
  const selected = await checkbox(`Select scopes to grant ${grantee} access to:`, items);
  console.log();

  if (selected === null) {
    console.log(dim("  No changes made."));
    return;
  }

  const { toGrant, toRevoke } = diffGrants(selected, currentGrants, grantee);

  if (toGrant.length === 0 && toRevoke.length === 0) {
    console.log(dim(`  Nothing changed — ${grantee}'s access is already up to date.`));
    return;
  }

  await Promise.all([
    ...toGrant.map((s) => grantAccess(grantee, s)),
    ...toRevoke.map((s) => revokeAccess(grantee, s)),
  ]);

  if (toGrant.length > 0) {
    console.log(`  ${green("✓")} ${grantee} can now see:`);
    for (const s of toGrant) console.log(`    · ${s}`);
  }
  if (toRevoke.length > 0) {
    console.log(`  ${dim("–")} Removed ${grantee}'s access to:`);
    for (const s of toRevoke) console.log(`    · ${s}`);
  }
}

export async function revoke(grantee: string, scopePattern: string): Promise<void> {
  await revokeAccess(grantee, scopePattern);
  console.log(`  ${green("✓")} Revoked ${grantee} access to ${scopePattern}`);
}

export async function grants(): Promise<void> {
  const list = await listGrants();

  if (list.length === 0) {
    console.log(dim("No grants yet. Run `claude-coop grant <user>` to share access."));
    return;
  }

  for (const g of list) {
    console.log(`${g.scope_pattern}  →  ${g.grantee_username}`);
  }
}
