-- ============================================================================
-- Silicon Valley — Migration 004: app settings
--
-- A tiny key/value store so preferences (follow-up rules, for now) live with
-- the data instead of in one browser. Safe to run in one go.
-- ============================================================================

create table if not exists public.app_settings (
  key text not null,
  value jsonb not null,
  updated_at timestamp with time zone not null default now(),
  constraint app_settings_pkey primary key (key)
);

alter table public.app_settings enable row level security;

drop policy if exists "Authenticated users can read settings" on public.app_settings;
create policy "Authenticated users can read settings"
  on public.app_settings for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can write settings" on public.app_settings;
create policy "Authenticated users can write settings"
  on public.app_settings for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update settings" on public.app_settings;
create policy "Authenticated users can update settings"
  on public.app_settings for update using (auth.role() = 'authenticated');

do $$
begin
  alter publication supabase_realtime add table public.app_settings;
exception when duplicate_object then null;
end $$;
