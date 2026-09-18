create function public.clear_legacy_episode_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.episode_number is not null then
    delete from public.extension_watch_progress
    where user_id = new.user_id
      and provider = new.provider
      and lower(trim(detected_title)) = lower(trim(new.detected_title))
      and episode_number is null
      and event_id <> new.event_id;
  end if;
  return new;
end;
$$;

create trigger extension_progress_clear_legacy_episode
  before insert or update of season_number, episode_number, detected_title
  on public.extension_watch_progress
  for each row execute function public.clear_legacy_episode_progress();

revoke all on function public.clear_legacy_episode_progress() from public, anon, authenticated;
