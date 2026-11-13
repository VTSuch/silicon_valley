-- ============================================================================
-- Silicon Valley — Migration 017: outreach (extraction + LinkedIn queue)
--
-- Two tables:
--   outreach_searches   one row per search ("Account Executive" in "San Francisco")
--   outreach_prospects  the people extracted from Paraform for a search, plus
--                       where each one is in the outreach: pending → sent →
--                       accepted → replied → interested / declined
--
-- Prospects are NOT candidates: they are cold leads. When one becomes
-- interested you add them as a candidate from the Outreach list.
--
-- Shared settings (message templates, limits) live in app_settings under the
-- key 'outreach_settings', so no table is needed for them.
--
-- Safe to run in one go.
-- ============================================================================

create table if not exists public.outreach_searches (
  id uuid not null default gen_random_uuid(),
  job_title text not null,
  location text null,
  notes text null,
  created_by text null,
  archived_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  constraint outreach_searches_pkey primary key (id)
);

create table if not exists public.outreach_prospects (
  id uuid not null default gen_random_uuid(),
  search_id uuid not null references public.outreach_searches (id) on delete cascade,
  -- Import order. The queue serves prospects in this order.
  position bigint generated always as identity,
  name text not null,
  company text null,
  title text null,
  location text null,
  tier text null,
  linkedin_url text not null,
  status text not null default 'pending',
  -- When it was marked as sent, and by whom (so two people can share a queue).
  sent_at timestamp with time zone null,
  sent_by text null,
  -- When the status last changed.
  status_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint outreach_prospects_pkey primary key (id),
  constraint outreach_prospects_status_check check (
    status in ('pending', 'sent', 'accepted', 'replied', 'interested', 'declined', 'skipped')
  ),
  -- The same person can't be queued twice within one search.
  constraint outreach_prospects_search_url_key unique (search_id, linkedin_url)
);

create index if not exists idx_outreach_prospects_search on public.outreach_prospects (search_id);
create index if not exists idx_outreach_prospects_status on public.outreach_prospects (status);
create index if not exists idx_outreach_prospects_sent_at on public.outreach_prospects (sent_at);
create index if not exists idx_outreach_prospects_url on public.outreach_prospects (linkedin_url);

-- Row level security: any signed-in user (you and your partner) can do everything.
alter table public.outreach_searches enable row level security;
alter table public.outreach_prospects enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['outreach_searches', 'outreach_prospects'] loop
    execute format('drop policy if exists "Authenticated users can view %1$s" on public.%1$s', t);
    execute format(
      'create policy "Authenticated users can view %1$s" on public.%1$s for select using (auth.role() = ''authenticated'')', t);
    execute format('drop policy if exists "Authenticated users can insert %1$s" on public.%1$s', t);
    execute format(
      'create policy "Authenticated users can insert %1$s" on public.%1$s for insert with check (auth.role() = ''authenticated'')', t);
    execute format('drop policy if exists "Authenticated users can update %1$s" on public.%1$s', t);
    execute format(
      'create policy "Authenticated users can update %1$s" on public.%1$s for update using (auth.role() = ''authenticated'')', t);
    execute format('drop policy if exists "Authenticated users can delete %1$s" on public.%1$s', t);
    execute format(
      'create policy "Authenticated users can delete %1$s" on public.%1$s for delete using (auth.role() = ''authenticated'')', t);
  end loop;
end $$;

-- Live updates, so your partner sees a prospect marked as sent right away.
do $$
begin
  alter publication supabase_realtime add table public.outreach_searches;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.outreach_prospects;
exception when duplicate_object then null;
end $$;
