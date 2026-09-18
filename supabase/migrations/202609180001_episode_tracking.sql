alter table public.extension_watch_progress
  add column season_number integer check (season_number >= 0),
  add column episode_number integer check (episode_number > 0),
  add column episode_title text;

alter table public.extension_watch_progress
  add constraint extension_watch_progress_episode_pair
  check ((season_number is null) = (episode_number is null));

create function public.sync_extension_progress_v2(
  p_token_hash text,
  p_event_id uuid,
  p_provider text,
  p_provider_item_id text,
  p_detected_title text,
  p_season_number integer,
  p_episode_number integer,
  p_episode_title text,
  p_duration_seconds integer,
  p_current_time_seconds integer,
  p_progress_percent numeric,
  p_coverage_percent numeric,
  p_observed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device public.extension_devices%rowtype;
  v_existing_user_id uuid;
  v_dismissed_at timestamptz;
begin
  if char_length(p_token_hash) <> 64 then
    return jsonb_build_object('authenticated', false, 'synced', false);
  end if;

  select * into v_device
  from public.extension_devices
  where token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('authenticated', false, 'synced', false);
  end if;

  if p_provider not in ('netflix', 'disney', 'prime_video', 'max')
    or char_length(trim(p_detected_title)) not between 1 and 300
    or p_duration_seconds <= 0
    or p_current_time_seconds < 0
    or p_progress_percent < 0 or p_progress_percent > 100
    or p_coverage_percent < 0 or p_coverage_percent > 100
    or ((p_season_number is null) <> (p_episode_number is null))
    or p_season_number < 0 or p_episode_number <= 0 then
    return jsonb_build_object('authenticated', true, 'synced', false);
  end if;

  select user_id, dismissed_at into v_existing_user_id, v_dismissed_at
  from public.extension_watch_progress
  where event_id = p_event_id;

  if found and v_existing_user_id <> v_device.user_id then
    return jsonb_build_object('authenticated', true, 'synced', false);
  end if;
  if v_dismissed_at is not null then
    return jsonb_build_object('authenticated', true, 'synced', true, 'dismissed', true);
  end if;

  insert into public.extension_watch_progress (
    user_id, extension_device_id, event_id, provider, provider_item_id,
    detected_title, season_number, episode_number, episode_title,
    duration_seconds, current_time_seconds, progress_percent,
    coverage_percent, last_seen_at
  ) values (
    v_device.user_id, v_device.id, p_event_id, p_provider, p_provider_item_id,
    trim(p_detected_title), p_season_number, p_episode_number, nullif(trim(p_episode_title), ''),
    p_duration_seconds, least(p_current_time_seconds, p_duration_seconds),
    p_progress_percent, p_coverage_percent, p_observed_at
  )
  on conflict (event_id) do update set
    extension_device_id = excluded.extension_device_id,
    provider = excluded.provider,
    provider_item_id = excluded.provider_item_id,
    detected_title = excluded.detected_title,
    season_number = excluded.season_number,
    episode_number = excluded.episode_number,
    episode_title = excluded.episode_title,
    duration_seconds = excluded.duration_seconds,
    current_time_seconds = excluded.current_time_seconds,
    progress_percent = excluded.progress_percent,
    coverage_percent = excluded.coverage_percent,
    last_seen_at = excluded.last_seen_at;

  update public.extension_devices set last_seen_at = now() where id = v_device.id;
  return jsonb_build_object('authenticated', true, 'synced', true, 'dismissed', false);
end;
$$;

create function public.sync_extension_watch_v2(
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
  p_vote_average numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device public.extension_devices%rowtype;
  v_title_id uuid;
  v_episode_id uuid;
  v_session_id uuid;
  v_existing_user_id uuid;
begin
  select * into v_device
  from public.extension_devices
  where token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('authenticated', false, 'synced', false);
  end if;

  if p_provider not in ('netflix', 'disney', 'prime_video', 'max')
    or char_length(trim(p_detected_title)) not between 1 and 300
    or p_coverage_percent < 80 or p_coverage_percent > 100
    or ((p_season_number is null) <> (p_episode_number is null))
    or p_season_number < 0 or p_episode_number <= 0 then
    return jsonb_build_object('authenticated', true, 'synced', false);
  end if;

  select user_id into v_existing_user_id
  from public.watch_sessions
  where extension_event_id = p_event_id;

  if found then
    return jsonb_build_object(
      'authenticated', v_existing_user_id = v_device.user_id,
      'synced', v_existing_user_id = v_device.user_id,
      'duplicate', true
    );
  end if;

  if p_tmdb_id is not null and p_media_type in ('movie', 'tv') then
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
  end if;

  if v_title_id is not null and p_media_type = 'tv'
    and p_season_number is not null and p_episode_number is not null then
    insert into public.episodes (title_id, season_number, episode_number, title)
    values (
      v_title_id, p_season_number, p_episode_number,
      coalesce(nullif(trim(p_episode_title), ''), 'Episode ' || p_episode_number)
    )
    on conflict (title_id, season_number, episode_number) do update set
      title = case
        when excluded.title = 'Episode ' || excluded.episode_number then public.episodes.title
        else excluded.title
      end
    returning id into v_episode_id;
  end if;

  insert into public.watch_sessions (
    user_id, title_id, episode_id, provider, provider_item_id, detected_title,
    duration_seconds, unique_seconds, coverage_percent, status,
    started_at, last_seen_at, watched_at, extension_event_id, metadata
  ) values (
    v_device.user_id, v_title_id, v_episode_id, p_provider, p_provider_item_id,
    trim(p_detected_title), p_duration_seconds,
    case when p_duration_seconds is null then 0
      else least(p_duration_seconds, round(p_duration_seconds * p_coverage_percent / 100.0)::integer)
    end,
    p_coverage_percent, 'watched', p_watched_at, p_watched_at,
    p_watched_at, p_event_id,
    jsonb_build_object(
      'extension_device_id', v_device.id,
      'catalog_matched', v_title_id is not null,
      'season_number', p_season_number,
      'episode_number', p_episode_number,
      'episode_title', p_episode_title
    )
  )
  returning id into v_session_id;

  if v_episode_id is not null then
    insert into public.user_media_state (
      user_id, title_id, episode_id, status, progress_percent,
      first_watched_at, last_watched_at, watch_count
    ) values (
      v_device.user_id, v_title_id, v_episode_id, 'watched', 100,
      p_watched_at, p_watched_at, 1
    )
    on conflict (user_id, episode_id) where episode_id is not null do update set
      status = 'watched',
      progress_percent = 100,
      first_watched_at = coalesce(public.user_media_state.first_watched_at, p_watched_at),
      last_watched_at = greatest(public.user_media_state.last_watched_at, p_watched_at),
      watch_count = public.user_media_state.watch_count + 1;
  elsif v_title_id is not null and p_media_type = 'movie' then
    insert into public.user_media_state (
      user_id, title_id, status, progress_percent, first_watched_at,
      last_watched_at, watch_count
    ) values (
      v_device.user_id, v_title_id, 'watched', 100, p_watched_at, p_watched_at, 1
    )
    on conflict (user_id, title_id) where episode_id is null do update set
      status = 'watched',
      progress_percent = 100,
      first_watched_at = coalesce(public.user_media_state.first_watched_at, p_watched_at),
      last_watched_at = greatest(public.user_media_state.last_watched_at, p_watched_at),
      watch_count = public.user_media_state.watch_count + 1;
  end if;

  if v_title_id is not null and p_provider_item_id is not null then
    insert into public.source_mappings (
      user_id, provider, provider_item_id, title_id, episode_id, confidence, confirmed_by_user
    ) values (
      v_device.user_id, p_provider, p_provider_item_id, v_title_id, v_episode_id, 0.8, false
    )
    on conflict (user_id, provider, provider_item_id) do update set
      title_id = excluded.title_id,
      episode_id = excluded.episode_id,
      confidence = excluded.confidence;
  end if;

  update public.extension_devices
  set last_seen_at = now(), last_sync_at = now()
  where id = v_device.id;

  return jsonb_build_object(
    'authenticated', true,
    'synced', true,
    'matched', v_title_id is not null,
    'episode_tracked', v_episode_id is not null,
    'session_id', v_session_id
  );
end;
$$;

create function public.delete_watched_item(p_state_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_title_id uuid;
  v_episode_id uuid;
begin
  if v_user_id is null then return false; end if;

  select title_id, episode_id into v_title_id, v_episode_id
  from public.user_media_state
  where id = p_state_id and user_id = v_user_id;

  if not found then return false; end if;

  delete from public.watch_sessions
  where user_id = v_user_id
    and title_id = v_title_id
    and (episode_id = v_episode_id or (episode_id is null and v_episode_id is null));

  delete from public.user_media_state
  where id = p_state_id and user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.sync_extension_progress_v2(text, uuid, text, text, text, integer, integer, text, integer, integer, numeric, numeric, timestamptz) from public, anon, authenticated;
revoke all on function public.sync_extension_watch_v2(text, uuid, text, text, text, integer, integer, text, integer, numeric, timestamptz, integer, text, text, text, integer, text, text, text, numeric) from public, anon, authenticated;
revoke all on function public.delete_watched_item(uuid) from public, anon;
grant execute on function public.sync_extension_progress_v2(text, uuid, text, text, text, integer, integer, text, integer, integer, numeric, numeric, timestamptz) to anon, authenticated;
grant execute on function public.sync_extension_watch_v2(text, uuid, text, text, text, integer, integer, text, integer, numeric, timestamptz, integer, text, text, text, integer, text, text, text, numeric) to anon, authenticated;
grant execute on function public.delete_watched_item(uuid) to authenticated;
