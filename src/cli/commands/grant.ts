import { grantAccess, revokeAccess, listGrants } from "../../db/grants.ts";

export async function grant(grantee: string, scopePattern: string): Promise<void> {
  await grantAccess(grantee, scopePattern);
  console.log(`Granted ${grantee} access to ${scopePattern}`);
}

export async function revoke(grantee: string, scopePattern: string): Promise<void> {
  await revokeAccess(grantee, scopePattern);
  console.log(`Revoked ${grantee} access to ${scopePattern}`);
}

export async function grants(): Promise<void> {
  const list = await listGrants();

  if (list.length === 0) {
    console.log("No grants.");
    return;
  }

  for (const g of list) {
    console.log(`${g.scope_pattern}  →  ${g.grantee_user_id}`);
  }
}
