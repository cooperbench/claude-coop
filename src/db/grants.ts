import { getClient } from "./client.ts";
import type { Grant } from "../types.ts";

const SCOPE_PATTERN_RE = /^[a-zA-Z0-9_.-]+\/([\*]|[a-zA-Z0-9_.-]+(@[a-zA-Z0-9_.-]+)?)$/;

export async function grantAccess(granteeUsername: string, scopePattern: string): Promise<Grant> {
  if (!SCOPE_PATTERN_RE.test(scopePattern)) {
    throw new Error(`Invalid scope pattern: ${scopePattern}. Use format username/repo@machine or username/*`);
  }

  // Resolve grantee username to user_id
  const { data: grantee, error: userError } = await getClient()
    .from("users_public")
    .select("id")
    .eq("username", granteeUsername)
    .single();

  if (userError || !grantee) throw new Error(`User not found: ${granteeUsername}`);

  const { data, error } = await getClient()
    .from("grants")
    .insert({ grantee_user_id: grantee.id, scope_pattern: scopePattern })
    .select()
    .single();

  if (error) throw new Error(`Failed to create grant: ${error.message}`);
  return data as Grant;
}

export async function revokeAccess(granteeUsername: string, scopePattern: string): Promise<void> {
  const { data: grantee, error: userError } = await getClient()
    .from("users_public")
    .select("id")
    .eq("username", granteeUsername)
    .single();

  if (userError || !grantee) throw new Error(`User not found: ${granteeUsername}`);

  const { error } = await getClient()
    .from("grants")
    .delete()
    .eq("grantee_user_id", grantee.id)
    .eq("scope_pattern", scopePattern);

  if (error) throw new Error(`Failed to revoke grant: ${error.message}`);
}

export async function listGrants(): Promise<Grant[]> {
  const { data, error } = await getClient()
    .from("grants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list grants: ${error.message}`);
  return data as Grant[];
}
