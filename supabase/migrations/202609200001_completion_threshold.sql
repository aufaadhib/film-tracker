alter table public.profiles
  add column completion_threshold smallint not null default 80
  check (completion_threshold between 50 and 100);

create function public.get_extension_preferences(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completion_threshold smallint;
begin
  if char_length(p_token_hash) <> 64 then
    return jsonb_build_object('authenticated', false);
  end if;

  select profile.completion_threshold into v_completion_threshold
  from public.extension_devices as device
  join public.profiles as profile on profile.id = device.user_id
  where device.token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('authenticated', false);
  end if;

  return jsonb_build_object(
    'authenticated', true,
    'completion_threshold', v_completion_threshold
  );
end;
$$;

create function public.sync_extension_watch_v3(
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
  v_completion_threshold smallint;
  v_result jsonb;
begin
  select * into v_device
  from public.extension_devices
  where token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('authenticated', false, 'synced', false);
  end if;

  select completion_threshold into v_completion_threshold
  from public.profiles
  where id = v_device.user_id;
  v_completion_threshold := coalesce(v_completion_threshold, 80);

  if p_coverage_percent < v_completion_threshold or p_coverage_percent > 100 then
    return jsonb_build_object(
      'authenticated', true,
      'synced', false,
      'completion_threshold', v_completion_threshold
    );
  end if;

  v_result := public.sync_extension_watch_v2(
    p_token_hash,
    p_event_id,
    p_provider,
    p_provider_item_id,
    p_detected_title,
    p_season_number,
    p_episode_number,
    p_episode_title,
    p_duration_seconds,
    greatest(p_coverage_percent, 80),
    p_watched_at,
    p_tmdb_id,
    p_media_type,
    p_title,
    p_original_title,
    p_release_year,
    p_overview,
    p_poster_path,
    p_backdrop_path,
    p_vote_average
  );

  if coalesce((v_result ->> 'synced')::boolean, false) and p_coverage_percent < 80 then
    update public.watch_sessions
    set coverage_percent = p_coverage_percent,
        unique_seconds = case
          when p_duration_seconds is null then 0
          else least(p_duration_seconds, round(p_duration_seconds * p_coverage_percent / 100.0)::integer)
        end
    where extension_event_id = p_event_id
      and user_id = v_device.user_id;
  end if;

  return v_result || jsonb_build_object('completion_threshold', v_completion_threshold);
end;
$$;

revoke all on function public.get_extension_preferences(text) from public, anon, authenticated;
revoke all on function public.sync_extension_watch_v3(text, uuid, text, text, text, integer, integer, text, integer, numeric, timestamptz, integer, text, text, text, integer, text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.get_extension_preferences(text) to anon, authenticated;
grant execute on function public.sync_extension_watch_v3(text, uuid, text, text, text, integer, integer, text, integer, numeric, timestamptz, integer, text, text, text, integer, text, text, text, numeric) to anon, authenticated;
