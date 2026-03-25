-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Public user profiles (exposes GitHub username for grant lookups)
create table users_public (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

-- Populate on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into users_public (id, username)
  values (new.id, new.raw_user_meta_data->>'user_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Peers (one row per active Claude Code session)
create table squad (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null unique, -- e.g. "arpan/coop@macbook" or "arpan/coop#2@macbook"
  status text not null default 'online' check (status in ('online', 'offline')),
  summary text,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  from_scope text not null,
  to_scope text not null,
  body text not null,
  thread text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Grants (who can see/message which scopes)
create table grants (
  id uuid primary key default gen_random_uuid(),
  grantor_user_id uuid not null references auth.users(id) on delete cascade,
  grantee_user_id uuid not null references auth.users(id) on delete cascade,
  scope_pattern text not null, -- e.g. "arpan/coop@macbook" or "arpan/*"
  created_at timestamptz not null default now(),
  unique (grantor_user_id, grantee_user_id, scope_pattern)
);

-- View: all squad visible to the current user
create or replace view visible_squad with (security_invoker = false) as
select p.*
from squad p
where
  -- Own squad
  p.user_id = auth.uid()
  or
  -- Peers granted to you (with wildcard support)
  exists (
    select 1 from grants g
    where g.grantee_user_id = auth.uid()
      and (
        p.scope = g.scope_pattern
        or (g.scope_pattern like '%/*' and p.scope like replace(g.scope_pattern, '*', '%'))
      )
  );

-- RLS
alter table squad enable row level security;
alter table messages enable row level security;
alter table grants enable row level security;
alter table users_public enable row level security;

-- squad: own rows only for write; reads go through visible_squad view
create policy "own squad" on squad
  for all using (user_id = auth.uid());

-- messages: send only to visible scopes (own or granted), read your own inbox
create policy "send messages" on messages
  for insert with check (
    to_scope in (select scope from visible_squad)
  );

create policy "read inbox" on messages
  for select using (
    to_scope in (select scope from visible_squad)
    or from_scope in (select scope from squad where user_id = auth.uid())
  );

create policy "mark read" on messages
  for update using (
    to_scope in (select scope from squad where user_id = auth.uid())
  );

create policy "delete own messages" on messages
  for delete using (
    from_scope in (select scope from squad where user_id = auth.uid())
    or to_scope in (select scope from squad where user_id = auth.uid())
  );

-- grants: manage your own grants
create policy "manage grants" on grants
  for all using (grantor_user_id = auth.uid());

create policy "view received grants" on grants
  for select using (grantee_user_id = auth.uid());

-- users_public: readable by all authenticated users
create policy "read users" on users_public
  for select using (auth.role() = 'authenticated');

-- Thread membership (source of truth for who is in each thread)
create table thread_members (
  thread text not null,
  scope text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by text not null,
  added_at timestamptz not null default now(),
  primary key (thread, scope)
);

alter table thread_members enable row level security;

-- Only the authenticated user can insert rows they own
create policy "add thread members" on thread_members
  for insert with check (user_id = auth.uid());

-- RPC function to insert thread members atomically (bypasses upsert+RLS PostgREST issue)
create or replace function add_thread_members(p_thread text, p_scopes text[], p_added_by text)
returns void language sql security definer as $$
  insert into thread_members (thread, scope, user_id, added_by)
  select p_thread, unnest(p_scopes), auth.uid(), p_added_by
  on conflict (thread, scope) do nothing;
$$;

-- Only the authenticated user can delete rows they own
create policy "remove thread members" on thread_members
  for delete using (user_id = auth.uid());

-- Helper to check thread membership without triggering recursive RLS
create or replace function is_thread_member(p_thread text, p_user_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from thread_members
    where thread = p_thread and user_id = p_user_id
  );
$$;

-- You can read all members of a thread if your scope is already in it
create policy "read thread members" on thread_members
  for select using (
    is_thread_member(thread, auth.uid())
  );

-- Enable Realtime for messages
alter publication supabase_realtime add table messages;
