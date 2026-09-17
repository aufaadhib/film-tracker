alter table public.extension_watch_progress
  add column dismissed_at timestamptz;

create function public.dismiss_extension_progress(p_progress_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated integer;
begin
  if v_user_id is null then
    return false;
  end if;

  update public.extension_watch_progress
  set dismissed_at = now()
  where id = p_progress_id
    and user_id = v_user_id
    and dismissed_at is null;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.sync_extension_progress(
  p_token_hash text,
  p_event_id uuid,
  p_provider text,
  p_provider_item_id text,
  p_detected_title text,
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
    or p_coverage_percent < 0 or p_coverage_percent > 100 then
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
    detected_title, duration_seconds, current_time_seconds,
    progress_percent, coverage_percent, last_seen_at
  ) values (
    v_device.user_id, v_device.id, p_event_id, p_provider, p_provider_item_id,
    trim(p_detected_title), p_duration_seconds,
    least(p_current_time_seconds, p_duration_seconds),
    p_progress_percent, p_coverage_percent, p_observed_at
  )
  on conflict (event_id) do update set
    extension_device_id = excluded.extension_device_id,
    provider = excluded.provider,
    provider_item_id = excluded.provider_item_id,
    detected_title = excluded.detected_title,
    duration_seconds = excluded.duration_seconds,
    current_time_seconds = excluded.current_time_seconds,
    progress_percent = excluded.progress_percent,
    coverage_percent = excluded.coverage_percent,
    last_seen_at = excluded.last_seen_at;

  update public.extension_devices
  set last_seen_at = now()
  where id = v_device.id;

  return jsonb_build_object('authenticated', true, 'synced', true, 'dismissed', false);
end;
$$;

revoke all on function public.dismiss_extension_progress(uuid) from public, anon;
grant execute on function public.dismiss_extension_progress(uuid) to authenticated;
