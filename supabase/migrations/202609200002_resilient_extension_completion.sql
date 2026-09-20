create function public.sync_extension_watch_v4(
  p_token_hash text,
  p_event_id uuid,
  p_provider text,
  p_provider_item_id text,
  p_detected_title text,
  p_season_number integer,
  p_episode_number integer,
  p_episode_title text,
  p_duration_seconds integer,
  p_coverage_percent numeric,
  p_watched_at timestamptz,
  p_tmdb_id integer,
  p_media_type text,
  p_title text,
  p_original_title text,
  p_release_year integer,
  p_overview text,
  p_poster_path text,
  p_backdrop_path text,
  p_vote_average numeric,
  p_catalog_lookup_failed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device public.extension_devices%rowtype;
  v_existing public.watch_sessions%rowtype;
  v_completion_threshold smallint;
  v_tmdb_id integer := p_tmdb_id;
  v_media_type text := p_media_type;
  v_title text := p_title;
  v_original_title text := p_original_title;
  v_release_year integer := p_release_year;
  v_overview text := p_overview;
  v_poster_path text := p_poster_path;
  v_backdrop_path text := p_backdrop_path;
  v_vote_average numeric := p_vote_average;
  v_result jsonb;
begin
  select * into v_device
  from public.extension_devices
  where token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('authenticated', false, 'synced', false);
  end if;

  select coalesce(completion_threshold, 80) into v_completion_threshold
  from public.profiles
  where id = v_device.user_id;
  v_completion_threshold := coalesce(v_completion_threshold, 80);

  if v_tmdb_id is null then
    select
      progress.tmdb_id,
      progress.media_type,
      title.title,
      title.original_title,
      title.release_year,
      title.overview,
      title.poster_path,
      title.backdrop_path,
      title.vote_average
    into
      v_tmdb_id,
      v_media_type,
      v_title,
      v_original_title,
      v_release_year,
      v_overview,
      v_poster_path,
      v_backdrop_path,
      v_vote_average
    from public.extension_watch_progress as progress
    join public.catalog_titles as title
      on title.tmdb_id = progress.tmdb_id
      and title.media_type = progress.media_type
    where progress.user_id = v_device.user_id
      and progress.tmdb_id is not null
      and (
        progress.event_id = p_event_id
        or (
          p_provider_item_id is not null
          and progress.provider = p_provider
          and progress.provider_item_id = p_provider_item_id
          and progress.season_number is not distinct from p_season_number
          and progress.episode_number is not distinct from p_episode_number
        )
      )
    order by (progress.event_id = p_event_id) desc, progress.last_seen_at desc
    limit 1;
  end if;

  select * into v_existing
  from public.watch_sessions
  where extension_event_id = p_event_id
  for update;

  if found then
    if v_existing.user_id <> v_device.user_id then
      return jsonb_build_object('authenticated', false, 'synced', false);
    end if;
    if v_existing.title_id is not null then
      return jsonb_build_object(
        'authenticated', true,
        'synced', true,
        'matched', true,
        'duplicate', true,
        'completion_threshold', v_completion_threshold
      );
    end if;
    if v_tmdb_id is null then
      return jsonb_build_object(
        'authenticated', true,
        'synced', not coalesce(p_catalog_lookup_failed, false),
        'matched', false,
        'duplicate', true,
        'catalog_retry', coalesce(p_catalog_lookup_failed, false),
        'completion_threshold', v_completion_threshold
      );
    end if;
  end if;

  if v_tmdb_id is null and coalesce(p_catalog_lookup_failed, false) then
    return jsonb_build_object(
      'authenticated', true,
      'synced', false,
      'catalog_retry', true,
      'completion_threshold', v_completion_threshold
    );
  end if;

  if p_coverage_percent < v_completion_threshold or p_coverage_percent > 100 then
    return jsonb_build_object(
      'authenticated', true,
      'synced', false,
      'completion_threshold', v_completion_threshold
    );
  end if;

  if v_existing.id is not null and v_tmdb_id is not null then
    delete from public.watch_sessions where id = v_existing.id;
  end if;

  v_result := public.sync_extension_watch_v3(
    p_token_hash,
    p_event_id,
    p_provider,
    p_provider_item_id,
    p_detected_title,
    p_season_number,
    p_episode_number,
    p_episode_title,
    p_duration_seconds,
    p_coverage_percent,
    p_watched_at,
    v_tmdb_id,
    v_media_type,
    v_title,
    v_original_title,
    v_release_year,
    v_overview,
    v_poster_path,
    v_backdrop_path,
    v_vote_average
  );

  return v_result;
end;
$$;

create or replace function public.clear_extension_progress_on_watched()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'watched' and new.extension_event_id is not null then
    delete from public.extension_watch_progress as progress
    where progress.user_id = new.user_id
      and (
        progress.event_id = new.extension_event_id
        or (
          new.provider_item_id is not null
          and progress.provider = new.provider
          and progress.provider_item_id = new.provider_item_id
          and progress.season_number is not distinct from nullif(new.metadata ->> 'season_number', '')::integer
          and progress.episode_number is not distinct from nullif(new.metadata ->> 'episode_number', '')::integer
        )
      );
  end if;
  return new;
end;
$$;

do $$
declare
  v_watch record;
begin
  for v_watch in
    select distinct on (session.id)
      session.*,
      device.token_hash
    from public.watch_sessions as session
    join public.extension_watch_progress as progress
      on progress.user_id = session.user_id
      and progress.provider = session.provider
      and progress.tmdb_id is not null
      and (
        progress.event_id = session.extension_event_id
        or (
          session.provider_item_id is not null
          and progress.provider_item_id = session.provider_item_id
          and progress.season_number is not distinct from nullif(session.metadata ->> 'season_number', '')::integer
          and progress.episode_number is not distinct from nullif(session.metadata ->> 'episode_number', '')::integer
        )
      )
    join public.extension_devices as device
      on device.id = progress.extension_device_id
      and device.user_id = session.user_id
    join public.catalog_titles as title
      on title.tmdb_id = progress.tmdb_id
      and title.media_type = progress.media_type
    where session.status = 'watched'
      and session.title_id is null
      and session.extension_event_id is not null
    order by session.id, (progress.event_id = session.extension_event_id) desc, progress.last_seen_at desc
  loop
    perform public.sync_extension_watch_v4(
      v_watch.token_hash,
      v_watch.extension_event_id,
      v_watch.provider,
      v_watch.provider_item_id,
      v_watch.detected_title,
      nullif(v_watch.metadata ->> 'season_number', '')::integer,
      nullif(v_watch.metadata ->> 'episode_number', '')::integer,
      v_watch.metadata ->> 'episode_title',
      v_watch.duration_seconds,
      v_watch.coverage_percent,
      coalesce(v_watch.watched_at, v_watch.last_seen_at),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      false
    );
  end loop;
end;
$$;

revoke all on function public.sync_extension_watch_v4(text, uuid, text, text, text, integer, integer, text, integer, numeric, timestamptz, integer, text, text, text, integer, text, text, text, numeric, boolean) from public, anon, authenticated;
grant execute on function public.sync_extension_watch_v4(text, uuid, text, text, text, integer, integer, text, integer, numeric, timestamptz, integer, text, text, text, integer, text, text, text, numeric, boolean) to anon, authenticated;
