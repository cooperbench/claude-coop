import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_FILE } from "../config.ts";
import type { AuthSession } from "../types.ts";

function loadAuthToken(): string | null {
  try {
    const raw = readFileSync(AUTH_FILE, "utf8");
    const session = JSON.parse(raw) as AuthSession;
    return session.access_token;
  } catch {
    return null;
  }
}

let _client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (_client) return _client;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing COOP_SUPABASE_URL or COOP_SUPABASE_ANON_KEY");
  }

  const token = loadAuthToken();
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    auth: { persistSession: false },
  });

  return _client;
}
