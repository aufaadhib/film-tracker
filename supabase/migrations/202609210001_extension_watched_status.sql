create function public.get_extension_watched_status(
  p_token_hash text,
  p_provider text,
  p_provider_item_id text,
  p_season_number integer,
  p_episode_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_previously_watched boolean := false;
begin
  select user_id into v_user_id
  from public.extension_devices
  where token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('authenticated', false);
  end if;

  if p_provider not in ('netflix', 'disney', 'prime_video', 'max')
    or p_provider_item_id is null
    or ((p_season_number is null) <> (p_episode_number is null))
    or p_season_number < 0
    or p_episode_number <= 0 then
    return jsonb_build_object('authenticated', true, 'valid', false);
  end if;

  select exists (
    select 1
    from public.source_mappings as mapping
    join public.catalog_titles as title on title.id = mapping.title_id
    join public.user_media_state as state
      on state.user_id = v_user_id
      and state.title_id = mapping.title_id
      and state.status = 'watched'
    left join public.episodes as episode on episode.id = state.episode_id
    where mapping.user_id = v_user_id
      and mapping.provider = p_provider
      and mapping.provider_item_id = p_provider_item_id
      and (
        (
          p_episode_number is null
          and title.media_type = 'movie'
          and state.episode_id is null
        )
        or (
          p_episode_number is not null
          and episode.season_number = p_season_number
          and episode.episode_number = p_episode_number
        )
      )
  ) into v_previously_watched;

  return jsonb_build_object(
    'authenticated', true,
    'valid', true,
    'previously_watched', v_previously_watched
  );
end;
$$;

revoke all on function public.get_extension_watched_status(text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_extension_watched_status(text, text, text, integer, integer) to anon, authenticated;
