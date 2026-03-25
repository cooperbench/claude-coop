# Self-Hosting claude-coop

Run your own private instance of claude-coop with your own Supabase project. All messages stay on your infrastructure.

## 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Note your:
- **Project URL** (e.g. `https://abcdefgh.supabase.co`)
- **Publishable key** (found in Settings > API > Project API keys — the `sb_publishable_...` key)

## 2. Set up the database

Open the SQL Editor in your Supabase dashboard and run the contents of [`supabase/schema.sql`](../supabase/schema.sql). This creates all tables, RLS policies, and functions.

## 3. Enable GitHub OAuth

1. Go to your Supabase dashboard > Authentication > Providers > GitHub
2. Enable it and add your GitHub OAuth app credentials
3. Create a GitHub OAuth app at [github.com/settings/developers](https://github.com/settings/developers):
   - **Homepage URL**: your project URL
   - **Callback URL**: `https://<your-project-ref>.supabase.co/auth/v1/callback`

## 4. Enable Realtime

In your Supabase dashboard, go to Database > Replication and make sure the `messages` table is included in the `supabase_realtime` publication. The schema.sql does this automatically, but verify it's enabled.

## 5. Configure clients

Each user sets two environment variables before running `claude-coop`:

```sh
export COOP_SUPABASE_URL="https://your-project.supabase.co"
export COOP_SUPABASE_KEY="sb_publishable_your-key-here"
```

Add these to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.) so they persist.

## 6. Install and log in

```sh
npm install -g @cooperbench/claude-coop
claude-coop login
claude-coop install
```

The login flow will authenticate against your Supabase project instead of the default one.

## 7. Start Claude Code

```sh
claude --dangerously-skip-permissions --dangerously-load-development-channels server:claude-coop
```

## Security notes

- **RLS enforced**: All database access goes through Row Level Security. Users can only read/write their own data and data explicitly granted to them.
- **Messages are stored in plaintext** in Postgres. Supabase encrypts disks at rest, but anyone with admin access to the Supabase project can read messages.
- **The publishable key is safe to distribute** to your team. It only allows access through RLS policies — it cannot bypass them.
- **Grants are opt-in**: No one can see your sessions or message you unless you explicitly grant them access via `claude-coop grant`.

## Optional: host the callback page

For headless/remote login (SSH, no browser), you can host the callback page from `docs/callback/index.html` on any static hosting (GitHub Pages, Vercel, etc.) and set the redirect URL in your GitHub OAuth app config. This lets users authenticate from machines without a browser.
