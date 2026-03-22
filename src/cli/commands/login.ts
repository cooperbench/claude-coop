import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { createServer } from "http";
import type { AddressInfo } from "net";
import { SUPABASE_URL, SUPABASE_ANON_KEY, CONFIG_DIR, AUTH_FILE } from "../../config.ts";

export async function login(): Promise<void> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: "pkce", persistSession: false },
  });

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const port = (server.address() as AddressInfo).port;
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>coop</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0a0a0a; color: #fff; }
    .card { text-align: center; }
    h1 { font-size: 1.5rem; font-weight: 500; margin-bottom: 0.5rem; }
    p { color: #888; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>You're logged in</h1>
    <p>You can close this tab and return to the terminal.</p>
  </div>
</body>
</html>`);
      server.close();

      if (code) resolve(code);
      else reject(new Error(error ?? "No code received"));
    });

    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      const callbackUrl = `http://localhost:${port}/callback`;

      client.auth
        .signInWithOAuth({
          provider: "github",
          options: { redirectTo: callbackUrl, skipBrowserRedirect: true },
        })
        .then(({ data, error }) => {
          if (error) { server.close(); reject(error); return; }
          Bun.spawn(["open", data.url]);
          console.log(`\nOpening browser for authentication...`);
          console.log(`If it didn't open, visit:\n\n  ${data.url}\n`);
        });
    });

    setTimeout(() => { server.close(); reject(new Error("Timed out")); }, 5 * 60 * 1000);
  });

  const { data: sessionData, error: sessionError } = await client.auth.exchangeCodeForSession(code);
  if (sessionError) throw new Error(`Session exchange failed: ${sessionError.message}`);

  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(AUTH_FILE, JSON.stringify(sessionData.session, null, 2));

  const username = sessionData.session.user.user_metadata["user_name"] as string;
  console.log(`Logged in as ${username}`);
  process.exit(0);
}
