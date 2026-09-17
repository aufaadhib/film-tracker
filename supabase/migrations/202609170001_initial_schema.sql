create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_titles (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null check (char_length(title) between 1 and 300),
  original_title text not null check (char_length(original_title) between 1 and 300),
  release_year integer check (release_year between 1870 and 2200),
  overview text not null default '',
  poster_path text,
  backdrop_path text,
  vote_average numeric(3, 1) not null default 0 check (vote_average between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (media_type, tmdb_id)
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.catalog_titles(id) on delete cascade,
  tmdb_id integer,
  season_number integer not null check (season_number >= 0),
  episode_number integer not null check (episode_number > 0),
  title text not null default '',
  air_date date,
  runtime_minutes integer check (runtime_minutes > 0),
  created_at timestamptz not null default now(),
  unique (title_id, season_number, episode_number),
  unique (tmdb_id)
);

create table public.watch_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id uuid references public.catalog_titles(id) on delete set null,
  episode_id uuid references public.episodes(id) on delete set null,
  provider text not null check (provider in ('netflix', 'disney', 'prime_video', 'max', 'other', 'manual', 'import')),
  provider_item_id text,
  detected_title text,
  duration_seconds integer check (duration_seconds > 0),
  unique_seconds integer not null default 0 check (unique_seconds >= 0),
  coverage_percent numeric(5, 2) not null default 0 check (coverage_percent between 0 and 100),
  status text not null default 'watching' check (status in ('watching', 'watched', 'dismissed')),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  watched_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.user_media_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id uuid not null references public.catalog_titles(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  status text not null check (status in ('in_progress', 'watched')),
  progress_percent numeric(5, 2) not null default 0 check (progress_percent between 0 and 100),
  first_watched_at timestamptz,
  last_watched_at timestamptz not null default now(),
  watch_count integer not null default 0 check (watch_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index user_media_state_title_unique
  on public.user_media_state (user_id, title_id)
  where episode_id is null;
create unique index user_media_state_episode_unique
  on public.user_media_state (user_id, episode_id)
  where episode_id is not null;

create table public.source_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_item_id text not null,
  title_id uuid not null references public.catalog_titles(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  confidence numeric(4, 3) not null default 1 check (confidence between 0 and 1),
  confirmed_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, provider, provider_item_id)
);

create table public.enabled_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hostname text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, hostname)
);

create table public.extension_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null default 'Browser',
  extension_install_id uuid not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, extension_install_id)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('netflix_csv')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index watch_sessions_user_last_seen_idx on public.watch_sessions (user_id, last_seen_at desc);
create index watch_sessions_open_idx on public.watch_sessions (user_id, provider, provider_item_id) where status = 'watching';
create index user_media_state_recent_idx on public.user_media_state (user_id, last_watched_at desc);
create index episodes_title_idx on public.episodes (title_id, season_number, episode_number);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger catalog_titles_set_updated_at before update on public.catalog_titles
for each row execute function public.set_updated_at();
create trigger user_media_state_set_updated_at before update on public.user_media_state
for each row execute function public.set_updated_at();
create trigger enabled_sites_set_updated_at before update on public.enabled_sites
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users who signed in before this migration was installed.
insert into public.profiles (id, display_name, avatar_url)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.catalog_titles enable row level security;
alter table public.episodes enable row level security;
alter table public.watch_sessions enable row level security;
alter table public.user_media_state enable row level security;
alter table public.source_mappings enable row level security;
alter table public.enabled_sites enable row level security;
alter table public.extension_devices enable row level security;
alter table public.import_jobs enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "catalog_read" on public.catalog_titles for select to anon, authenticated using (true);
create policy "episodes_read" on public.episodes for select to anon, authenticated using (true);

create policy "watch_sessions_own" on public.watch_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_media_state_own" on public.user_media_state for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "source_mappings_own" on public.source_mappings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "enabled_sites_own" on public.enabled_sites for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "extension_devices_own" on public.extension_devices for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "import_jobs_own" on public.import_jobs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon, authenticated;
grant select on public.catalog_titles, public.episodes to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.watch_sessions, public.user_media_state,
  public.source_mappings, public.enabled_sites, public.extension_devices, public.import_jobs to authenticated;

create function public.mark_title_watched(
  p_tmdb_id integer,
  p_media_type text,
  p_title text,
  p_original_title text,
  p_release_year integer,
  p_overview text,
  p_poster_path text,
  p_backdrop_path text,
  p_vote_average numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_title_id uuid;
  v_state_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_media_type not in ('movie', 'tv') or p_tmdb_id <= 0 then
    raise exception 'invalid title';
  end if;

  insert into public.catalog_titles (
    tmdb_id, media_type, title, original_title, release_year, overview,
    poster_path, backdrop_path, vote_average
  ) values (
    p_tmdb_id, p_media_type, p_title, p_original_title, p_release_year,
    coalesce(p_overview, ''), p_poster_path, p_backdrop_path, coalesce(p_vote_average, 0)
  )
  on conflict (media_type, tmdb_id) do update set
    title = excluded.title,
    original_title = excluded.original_title,
    release_year = excluded.release_year,
    overview = excluded.overview,
    poster_path = excluded.poster_path,
    backdrop_path = excluded.backdrop_path,
    vote_average = excluded.vote_average
  returning id into v_title_id;

  insert into public.user_media_state (
    user_id, title_id, status, progress_percent, first_watched_at,
    last_watched_at, watch_count
  ) values (
    v_user_id, v_title_id, 'watched', 100, now(), now(), 1
  )
  on conflict (user_id, title_id) where episode_id is null do update set
    status = 'watched',
    progress_percent = 100,
    first_watched_at = coalesce(public.user_media_state.first_watched_at, now()),
    last_watched_at = now(),
    watch_count = public.user_media_state.watch_count + 1
  returning id into v_state_id;

  return jsonb_build_object('state_id', v_state_id, 'title_id', v_title_id);
end;
$$;

revoke all on function public.mark_title_watched(integer, text, text, text, integer, text, text, text, numeric) from public, anon;
grant execute on function public.mark_title_watched(integer, text, text, text, integer, text, text, text, numeric) to authenticated;
