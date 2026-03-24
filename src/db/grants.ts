import { getClient } from "./client.ts";

const SCOPE_PATTERN_RE = /^[a-zA-Z0-9_.-]+\/([\*]|[a-zA-Z0-9_.-]+(@[a-zA-Z0-9_.-]+)?)$/;

export async function grantAccess(granteeUsername: string, scopePattern: string): Promise<void> {
  if (!SCOPE_PATTERN_RE.test(scopePattern)) {
    throw new Error(`Invalid scope pattern: ${scopePattern}. Use format username/repo@machine or username/*`);
  }

  const { data: grantee, error: userError } = await getClient()
    .from("users_public")
    .select("id")
    .eq("username", granteeUsername)
    .single();

  if (userError || !grantee) throw new Error(`User not found: ${granteeUsername}`);

  const { error } = await getClient()
    .from("grants")
    .insert({ grantee_user_id: grantee.id, scope_pattern: scopePattern });

  if (error) {
    if (error.code === "23505") return; // already granted — idempotent
    throw new Error(`Failed to create grant: ${error.message}`);
  }
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

export type GrantDisplay = {
  scope_pattern: string;
  grantee_username: string;
  created_at: string;
};

export async function listGrants(): Promise<GrantDisplay[]> {
  const { data, error } = await getClient()
    .from("grants")
    .select("scope_pattern, grantee_user_id, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list grants: ${error.message}`);
  if (!data || data.length === 0) return [];

  const rows = data as { scope_pattern: string; grantee_user_id: string; created_at: string }[];
  const ids = [...new Set(rows.map((r) => r.grantee_user_id))];

  const { data: users, error: usersError } = await getClient()
    .from("users_public")
    .select("id, username")
    .in("id", ids);

  if (usersError) throw new Error(`Failed to resolve usernames: ${usersError.message}`);

  const usernameById = new Map((users as { id: string; username: string }[]).map((u) => [u.id, u.username]));

  return rows.map((r) => ({
    scope_pattern: r.scope_pattern,
    grantee_username: usernameById.get(r.grantee_user_id) ?? r.grantee_user_id,
    created_at: r.created_at,
  }));
}
