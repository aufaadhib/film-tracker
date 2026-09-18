alter table public.profiles
  add column if not exists country_code text not null default 'ID';

alter table public.profiles
  add constraint profiles_country_code_format
  check (country_code ~ '^[A-Z]{2}$');

alter table public.catalog_titles
  add column if not exists release_date date;

create table public.user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id uuid not null references public.catalog_titles(id) on delete cascade,
  is_priority boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, title_id)
);

create index user_watchlist_priority_idx
  on public.user_watchlist (user_id, is_priority desc, created_at desc);

create trigger user_watchlist_set_updated_at before update on public.user_watchlist
for each row execute function public.set_updated_at();

alter table public.user_watchlist enable row level security;

create policy "user_watchlist_own" on public.user_watchlist for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.user_watchlist from anon, authenticated;
grant select, insert, update, delete on public.user_watchlist to authenticated;

create function public.add_to_watchlist(
  p_tmdb_id integer,
  p_media_type text,
  p_title text,
  p_original_title text,
  p_release_year integer,
  p_release_date date,
  p_overview text,
  p_poster_path text,
  p_backdrop_path text,
  p_vote_average numeric,
  p_series_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_title_id uuid;
  v_watchlist_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_media_type not in ('movie', 'tv') or p_tmdb_id <= 0 then
    raise exception 'invalid title';
  end if;
  if char_length(trim(p_title)) not between 1 and 300
    or char_length(trim(p_original_title)) not between 1 and 300
    or (p_series_status is not null and p_series_status not in ('ongoing', 'ended', 'upcoming')) then
    raise exception 'invalid metadata';
  end if;

  insert into public.catalog_titles (
    tmdb_id, media_type, title, original_title, release_year, release_date,
    overview, poster_path, backdrop_path, vote_average, series_status
  ) values (
    p_tmdb_id, p_media_type, trim(p_title), trim(p_original_title), p_release_year,
    p_release_date, coalesce(p_overview, ''), p_poster_path, p_backdrop_path,
    coalesce(p_vote_average, 0), case when p_media_type = 'tv' then p_series_status else null end
  )
  on conflict (media_type, tmdb_id) do update set
    title = excluded.title,
    original_title = excluded.original_title,
    release_year = excluded.release_year,
    release_date = excluded.release_date,
    overview = excluded.overview,
    poster_path = excluded.poster_path,
    backdrop_path = excluded.backdrop_path,
    vote_average = excluded.vote_average,
    series_status = excluded.series_status
  returning id into v_title_id;

  insert into public.user_watchlist (user_id, title_id)
  values (v_user_id, v_title_id)
  on conflict (user_id, title_id) do update set updated_at = now()
  returning id into v_watchlist_id;

  return jsonb_build_object('watchlist_id', v_watchlist_id, 'title_id', v_title_id);
end;
$$;

create function public.remove_started_title_from_watchlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_watchlist
  where user_id = new.user_id and title_id = new.title_id;
  return new;
end;
$$;

create function public.remove_extension_title_from_watchlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tmdb_id is not null and new.media_type in ('movie', 'tv') then
    delete from public.user_watchlist as watchlist
    using public.catalog_titles as title
    where watchlist.user_id = new.user_id
      and watchlist.title_id = title.id
      and title.tmdb_id = new.tmdb_id
      and title.media_type = new.media_type;
  end if;
  return new;
end;
$$;

create trigger user_media_state_remove_watchlist
  after insert or update on public.user_media_state
  for each row execute function public.remove_started_title_from_watchlist();

create trigger extension_progress_remove_watchlist
  after insert or update of tmdb_id, media_type on public.extension_watch_progress
  for each row execute function public.remove_extension_title_from_watchlist();

revoke all on function public.add_to_watchlist(integer, text, text, text, integer, date, text, text, text, numeric, text) from public, anon;
revoke all on function public.remove_started_title_from_watchlist() from public, anon, authenticated;
revoke all on function public.remove_extension_title_from_watchlist() from public, anon, authenticated;
grant execute on function public.add_to_watchlist(integer, text, text, text, integer, date, text, text, text, numeric, text) to authenticated;
