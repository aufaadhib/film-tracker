delete from public.user_media_state as state
using public.catalog_titles as title
where state.title_id = title.id
  and title.media_type = 'tv'
  and state.episode_id is null
  and exists (
    select 1
    from public.watch_sessions as session
    where session.user_id = state.user_id
      and session.title_id = state.title_id
      and session.episode_id is null
      and session.extension_event_id is not null
  );
