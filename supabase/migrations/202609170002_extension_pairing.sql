create table public.extension_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique check (char_length(code_hash) = 64),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.extension_devices
  add column token_hash text unique,
  add column paired_at timestamptz not null default now(),
  add column last_sync_at timestamptz;

create unique index extension_devices_install_unique
  on public.extension_devices (extension_install_id);

alter table public.watch_sessions
  add column extension_event_id uuid;

create unique index watch_sessions_extension_event_unique
  on public.watch_sessions (extension_event_id)
  where extension_event_id is not null;

create index extension_pairing_codes_expiry_idx
  on public.extension_pairing_codes (expires_at)
  where consumed_at is null;

alter table public.extension_pairing_codes enable row level security;

create policy "extension_pairing_codes_select_own"
  on public.extension_pairing_codes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "extension_pairing_codes_insert_own"
  on public.extension_pairing_codes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "extension_pairing_codes_delete_own"
  on public.extension_pairing_codes for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.extension_pairing_codes from anon, authenticated;
grant select, insert, delete on public.extension_pairing_codes to authenticated;

create function public.claim_extension_device(
  p_code_hash text,
  p_install_id uuid,
  p_device_name text,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pairing public.extension_pairing_codes%rowtype;
  v_device_id uuid;
begin
  if char_length(p_code_hash) <> 64
    or char_length(p_token_hash) <> 64
    or char_length(trim(p_device_name)) not between 1 and 80 then
    return jsonb_build_object('paired', false);
  end if;

  select * into v_pairing
  from public.extension_pairing_codes
  where code_hash = p_code_hash
    and consumed_at is null
    and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('paired', false);
  end if;

  insert into public.extension_devices (
    user_id, device_name, extension_install_id, token_hash,
    paired_at, last_seen_at
  ) values (
    v_pairing.user_id, trim(p_device_name), p_install_id, p_token_hash,
    now(), now()
  )
  on conflict (extension_install_id) do update set
    user_id = excluded.user_id,
    device_name = excluded.device_name,
    token_hash = excluded.token_hash,
    paired_at = now(),
    last_seen_at = now(),
    last_sync_at = null
  returning id into v_device_id;

  update public.extension_pairing_codes
  set consumed_at = now()
  where id = v_pairing.id;

  return jsonb_build_object('paired', true, 'device_id', v_device_id);
end;
$$;

create function public.sync_extension_watch(
  p_token_hash text,
  p_event_id uuid,
  p_provider text,
  p_provider_item_id text,
  p_detected_title text,
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
  v_session_id uuid;
  v_existing_user_id uuid;
begin
  if p_provider not in ('netflix', 'disney', 'prime_video', 'max')
    or char_length(trim(p_detected_title)) not between 1 and 300
    or p_coverage_percent < 80 or p_coverage_percent > 100 then
    return jsonb_build_object('authenticated', true, 'synced', false);
  end if;

  select * into v_device
  from public.extension_devices
  where token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('authenticated', false, 'synced', false);
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
      coalesce(p_overview, ''), p_poster_path, p_backdrop_path,
      coalesce(p_vote_average, 0)
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

  insert into public.watch_sessions (
    user_id, title_id, provider, provider_item_id, detected_title,
    duration_seconds, unique_seconds, coverage_percent, status,
    started_at, last_seen_at, watched_at, extension_event_id, metadata
  ) values (
    v_device.user_id, v_title_id, p_provider, p_provider_item_id,
    trim(p_detected_title), p_duration_seconds,
    case when p_duration_seconds is null then 0
      else least(p_duration_seconds, round(p_duration_seconds * p_coverage_percent / 100.0)::integer)
    end,
    p_coverage_percent, 'watched', p_watched_at, p_watched_at,
    p_watched_at, p_event_id,
    jsonb_build_object('extension_device_id', v_device.id, 'catalog_matched', v_title_id is not null)
  )
  returning id into v_session_id;

  if v_title_id is not null then
    insert into public.user_media_state (
      user_id, title_id, status, progress_percent, first_watched_at,
      last_watched_at, watch_count
    ) values (
      v_device.user_id, v_title_id, 'watched', 100, p_watched_at,
      p_watched_at, 1
    )
    on conflict (user_id, title_id) where episode_id is null do update set
      status = 'watched',
      progress_percent = 100,
      first_watched_at = coalesce(public.user_media_state.first_watched_at, p_watched_at),
      last_watched_at = greatest(public.user_media_state.last_watched_at, p_watched_at),
      watch_count = public.user_media_state.watch_count + 1;

    if p_provider_item_id is not null then
      insert into public.source_mappings (
        user_id, provider, provider_item_id, title_id, confidence, confirmed_by_user
      ) values (
        v_device.user_id, p_provider, p_provider_item_id, v_title_id, 0.8, false
      )
      on conflict (user_id, provider, provider_item_id) do update set
        title_id = excluded.title_id,
        confidence = excluded.confidence;
    end if;
  end if;

  update public.extension_devices
  set last_seen_at = now(), last_sync_at = now()
  where id = v_device.id;

  return jsonb_build_object(
    'authenticated', true,
    'synced', true,
    'matched', v_title_id is not null,
    'session_id', v_session_id
  );
end;
$$;

revoke all on function public.claim_extension_device(text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.sync_extension_watch(text, uuid, text, text, text, integer, numeric, timestamptz, integer, text, text, text, integer, text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.claim_extension_device(text, uuid, text, text) to anon, authenticated;
grant execute on function public.sync_extension_watch(text, uuid, text, text, text, integer, numeric, timestamptz, integer, text, text, text, integer, text, text, text, numeric) to anon, authenticated;
