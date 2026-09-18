alter table public.catalog_titles
  add column if not exists series_status text
  check (series_status in ('ongoing', 'ended', 'upcoming'));

alter table public.extension_watch_progress
  add column if not exists tmdb_id integer,
  add column if not exists media_type text check (media_type in ('movie', 'tv')),
  add column if not exists series_status text check (series_status in ('ongoing', 'ended', 'upcoming'));

create or replace function public.set_extension_progress_catalog(
  p_token_hash text,
  p_event_id uuid,
  p_tmdb_id integer,
  p_media_type text,
  p_series_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.extension_devices
  where token_hash = p_token_hash;

  if not found
    or p_tmdb_id <= 0
    or p_media_type not in ('movie', 'tv')
    or (p_series_status is not null and p_series_status not in ('ongoing', 'ended', 'upcoming')) then
    return false;
  end if;

  update public.extension_watch_progress
  set tmdb_id = p_tmdb_id,
      media_type = p_media_type,
      series_status = case when p_media_type = 'tv' then p_series_status else null end
  where event_id = p_event_id and user_id = v_user_id;

  return found;
end;
$$;

create or replace function public.set_extension_catalog_status(
  p_token_hash text,
  p_tmdb_id integer,
  p_series_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.extension_devices where token_hash = p_token_hash
  ) or p_tmdb_id <= 0
    or (p_series_status is not null and p_series_status not in ('ongoing', 'ended', 'upcoming')) then
    return false;
  end if;

  update public.catalog_titles
  set series_status = p_series_status
  where tmdb_id = p_tmdb_id and media_type = 'tv';

  return found;
end;
$$;

create or replace function public.set_owned_catalog_status(
  p_tmdb_id integer,
  p_series_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or p_tmdb_id <= 0
    or (p_series_status is not null and p_series_status not in ('ongoing', 'ended', 'upcoming')) then
    return false;
  end if;

  update public.catalog_titles as title
  set series_status = p_series_status
  where title.tmdb_id = p_tmdb_id
    and title.media_type = 'tv'
    and exists (
      select 1 from public.user_media_state as state
      where state.user_id = v_user_id and state.title_id = title.id
    );

  return found;
end;
$$;

delete from public.extension_watch_progress as progress
using public.watch_sessions as session
left join public.catalog_titles as title on title.id = session.title_id
left join public.episodes as episode on episode.id = session.episode_id
where progress.user_id = session.user_id
  and progress.provider = session.provider
  and session.status = 'watched'
  and (
    progress.event_id = session.extension_event_id
    or (
      progress.provider_item_id is not distinct from session.provider_item_id
      and (
        (progress.episode_number is null and (title.media_type = 'movie' or session.title_id is null))
        or (
          progress.season_number = episode.season_number
          and progress.episode_number = episode.episode_number
        )
      )
    )
  );

revoke all on function public.set_extension_progress_catalog(text, uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.set_extension_catalog_status(text, integer, text) from public, anon, authenticated;
revoke all on function public.set_owned_catalog_status(integer, text) from public, anon;
grant execute on function public.set_extension_progress_catalog(text, uuid, integer, text, text) to anon, authenticated;
grant execute on function public.set_extension_catalog_status(text, integer, text) to anon, authenticated;
grant execute on function public.set_owned_catalog_status(integer, text) to authenticated;
