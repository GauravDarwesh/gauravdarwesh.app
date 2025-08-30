-- Secure gd_ai_messages and gd_ai_sessions with explicit deny-all policies for anon/authenticated roles.
-- This prevents any direct table access from the client; access should go via Edge Functions (service role bypasses RLS).

-- Ensure RLS is enabled
alter table if exists public.gd_ai_messages enable row level security;
alter table if exists public.gd_ai_sessions enable row level security;

-- Drop existing policies if present to avoid duplicates
-- gd_ai_messages
drop policy if exists "No direct select on messages" on public.gd_ai_messages;
drop policy if exists "No direct insert on messages" on public.gd_ai_messages;
drop policy if exists "No direct update on messages" on public.gd_ai_messages;
drop policy if exists "No direct delete on messages" on public.gd_ai_messages;

-- gd_ai_sessions
drop policy if exists "No direct select on sessions" on public.gd_ai_sessions;
drop policy if exists "No direct insert on sessions" on public.gd_ai_sessions;
drop policy if exists "No direct update on sessions" on public.gd_ai_sessions;
drop policy if exists "No direct delete on sessions" on public.gd_ai_sessions;

-- Create explicit deny policies for anon and authenticated roles on gd_ai_messages
create policy "No direct select on messages"
  on public.gd_ai_messages
  for select
  to anon, authenticated
  using (false);

create policy "No direct insert on messages"
  on public.gd_ai_messages
  for insert
  to anon, authenticated
  with check (false);

create policy "No direct update on messages"
  on public.gd_ai_messages
  for update
  to anon, authenticated
  using (false)
  with check (false);

create policy "No direct delete on messages"
  on public.gd_ai_messages
  for delete
  to anon, authenticated
  using (false);

-- Create explicit deny policies for anon and authenticated roles on gd_ai_sessions
create policy "No direct select on sessions"
  on public.gd_ai_sessions
  for select
  to anon, authenticated
  using (false);

create policy "No direct insert on sessions"
  on public.gd_ai_sessions
  for insert
  to anon, authenticated
  with check (false);

create policy "No direct update on sessions"
  on public.gd_ai_sessions
  for update
  to anon, authenticated
  using (false)
  with check (false);

create policy "No direct delete on sessions"
  on public.gd_ai_sessions
  for delete
  to anon, authenticated
  using (false);
