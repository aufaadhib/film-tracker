create table public.extension_watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  extension_device_id uuid not null references public.extension_devices(id) on delete cascade,
  event_id uuid not null unique,
  provider text not null check (provider in ('netflix', 'disney', 'prime_video', 'max')),
  provider_item_id text,
  detected_title text not null check (char_length(detected_title) between 1 and 300),
  duration_seconds integer not null check (duration_seconds > 0),
  current_time_seconds integer not null check (current_time_seconds >= 0),
  progress_percent numeric(5, 2) not null check (progress_percent between 0 and 100),
  coverage_percent numeric(5, 2) not null check (coverage_percent between 0 and 100),
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index extension_watch_progress_user_recent_idx
  on public.extension_watch_progress (user_id, last_seen_at desc);

alter table public.extension_watch_progress enable row level security;

create policy "extension_watch_progress_select_own"
  on public.extension_watch_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "extension_watch_progress_delete_own"
  on public.extension_watch_progress for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.extension_watch_progress from anon, authenticated;
grant select, delete on public.extension_watch_progress to authenticated;

create function public.sync_extension_progress(
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

  select user_id into v_existing_user_id
  from public.extension_watch_progress
  where event_id = p_event_id;

  if found and v_existing_user_id <> v_device.user_id then
    return jsonb_build_object('authenticated', true, 'synced', false);
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

  return jsonb_build_object('authenticated', true, 'synced', true);
end;
$$;

create function public.clear_extension_progress_on_watched()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'watched' and new.extension_event_id is not null then
    delete from public.extension_watch_progress
    where event_id = new.extension_event_id
      and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger watch_sessions_clear_extension_progress
  after insert or update of status, extension_event_id on public.watch_sessions
  for each row execute function public.clear_extension_progress_on_watched();

revoke all on function public.sync_extension_progress(text, uuid, text, text, text, integer, integer, numeric, numeric, timestamptz) from public, anon, authenticated;
revoke all on function public.clear_extension_progress_on_watched() from public, anon, authenticated;
grant execute on function public.sync_extension_progress(text, uuid, text, text, text, integer, integer, numeric, numeric, timestamptz) to anon, authenticated;
