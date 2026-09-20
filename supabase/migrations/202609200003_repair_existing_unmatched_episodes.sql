do $$
declare
  v_watch record;
begin
  for v_watch in
    select
      session.*,
      device.token_hash,
      title.tmdb_id,
      title.media_type,
      title.title,
      title.original_title,
      title.release_year,
      title.overview,
      title.poster_path,
      title.backdrop_path,
      title.vote_average
    from public.watch_sessions as session
    join public.extension_devices as device
      on device.user_id = session.user_id
      and device.id::text = session.metadata ->> 'extension_device_id'
    join public.catalog_titles as title
      on (nullif(session.metadata ->> 'episode_number', '') is null or title.media_type = 'tv')
      and (
        lower(trim(title.title)) = lower(trim(session.detected_title))
        or lower(trim(title.original_title)) = lower(trim(session.detected_title))
      )
    where session.status = 'watched'
      and session.title_id is null
      and session.extension_event_id is not null
      and session.detected_title is not null
      and exists (
        select 1
        from public.user_media_state as state
        where state.user_id = session.user_id
          and state.title_id = title.id
      )
      and not exists (
        select 1
        from public.catalog_titles as duplicate
        where duplicate.id <> title.id
          and duplicate.media_type = title.media_type
          and (
            lower(trim(duplicate.title)) = lower(trim(session.detected_title))
            or lower(trim(duplicate.original_title)) = lower(trim(session.detected_title))
          )
      )
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
      v_watch.tmdb_id,
      v_watch.media_type,
      v_watch.title,
      v_watch.original_title,
      v_watch.release_year,
      v_watch.overview,
      v_watch.poster_path,
      v_watch.backdrop_path,
      v_watch.vote_average,
      false
    );
  end loop;
end;
$$;
