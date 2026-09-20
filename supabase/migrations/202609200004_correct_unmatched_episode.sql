create or replace function public.correct_unmatched_watch(
  p_session_id uuid,
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
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.watch_sessions%rowtype;
  v_title_id uuid;
  v_episode_id uuid;
  v_season_number integer;
  v_episode_number integer;
  v_episode_title text;
  v_watched_at timestamptz;
begin
  if v_user_id is null or p_tmdb_id <= 0 or p_media_type not in ('movie', 'tv') then
    return false;
  end if;

  select * into v_session
  from public.watch_sessions
  where id = p_session_id
    and user_id = v_user_id
    and title_id is null
    and status = 'watched'
  for update;

  if not found then
    return false;
  end if;

  insert into public.catalog_titles (
    tmdb_id, media_type, title, original_title, release_year, overview,
    poster_path, backdrop_path, vote_average
  ) values (
    p_tmdb_id, p_media_type, trim(p_title), trim(p_original_title), p_release_year,
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

  if p_media_type = 'tv'
    and v_session.metadata ->> 'season_number' ~ '^\d+$'
    and v_session.metadata ->> 'episode_number' ~ '^[1-9]\d*$' then
    v_season_number := (v_session.metadata ->> 'season_number')::integer;
    v_episode_number := (v_session.metadata ->> 'episode_number')::integer;
    v_episode_title := coalesce(
      nullif(trim(v_session.metadata ->> 'episode_title'), ''),
      'Episode ' || v_episode_number
    );

    insert into public.episodes (title_id, season_number, episode_number, title)
    values (v_title_id, v_season_number, v_episode_number, v_episode_title)
    on conflict (title_id, season_number, episode_number) do update set
      title = case
        when excluded.title = 'Episode ' || excluded.episode_number then public.episodes.title
        else excluded.title
      end
    returning id into v_episode_id;
  end if;

  update public.watch_sessions
  set title_id = v_title_id,
      episode_id = v_episode_id,
      metadata = metadata || jsonb_build_object('catalog_matched', true, 'corrected_by_user', true)
  where id = v_session.id;

  v_watched_at := coalesce(v_session.watched_at, v_session.last_seen_at, now());
  if v_episode_id is not null then
    delete from public.user_media_state
    where user_id = v_user_id and title_id = v_title_id and episode_id is null;

    insert into public.user_media_state (
      user_id, title_id, episode_id, status, progress_percent,
      first_watched_at, last_watched_at, watch_count
    ) values (
      v_user_id, v_title_id, v_episode_id, 'watched', 100,
      v_watched_at, v_watched_at, 1
    )
    on conflict (user_id, episode_id) where episode_id is not null do update set
      status = 'watched',
      progress_percent = 100,
      first_watched_at = least(coalesce(public.user_media_state.first_watched_at, v_watched_at), v_watched_at),
      last_watched_at = greatest(public.user_media_state.last_watched_at, v_watched_at),
      watch_count = public.user_media_state.watch_count + 1;
  else
    insert into public.user_media_state (
      user_id, title_id, status, progress_percent, first_watched_at,
      last_watched_at, watch_count
    ) values (
      v_user_id, v_title_id, 'watched', 100, v_watched_at, v_watched_at, 1
    )
    on conflict (user_id, title_id) where episode_id is null do update set
      status = 'watched',
      progress_percent = 100,
      first_watched_at = least(coalesce(public.user_media_state.first_watched_at, v_watched_at), v_watched_at),
      last_watched_at = greatest(public.user_media_state.last_watched_at, v_watched_at),
      watch_count = public.user_media_state.watch_count + 1;
  end if;

  if v_session.provider_item_id is not null then
    insert into public.source_mappings (
      user_id, provider, provider_item_id, title_id, episode_id, confidence, confirmed_by_user
    ) values (
      v_user_id, v_session.provider, v_session.provider_item_id,
      v_title_id, v_episode_id, 1, true
    )
    on conflict (user_id, provider, provider_item_id) do update set
      title_id = excluded.title_id,
      episode_id = excluded.episode_id,
      confidence = 1,
      confirmed_by_user = true;
  end if;

  return true;
end;
$$;

do $$
declare
  v_session public.watch_sessions%rowtype;
  v_episode_id uuid;
  v_watched_at timestamptz;
begin
  for v_session in
    select session.*
    from public.watch_sessions as session
    join public.catalog_titles as title on title.id = session.title_id
    where session.status = 'watched'
      and session.episode_id is null
      and title.media_type = 'tv'
      and session.metadata ->> 'season_number' ~ '^\d+$'
      and session.metadata ->> 'episode_number' ~ '^[1-9]\d*$'
  loop
    insert into public.episodes (title_id, season_number, episode_number, title)
    values (
      v_session.title_id,
      (v_session.metadata ->> 'season_number')::integer,
      (v_session.metadata ->> 'episode_number')::integer,
      coalesce(
        nullif(trim(v_session.metadata ->> 'episode_title'), ''),
        'Episode ' || (v_session.metadata ->> 'episode_number')::integer
      )
    )
    on conflict (title_id, season_number, episode_number) do update set
      title = case
        when excluded.title = 'Episode ' || excluded.episode_number then public.episodes.title
        else excluded.title
      end
    returning id into v_episode_id;

    update public.watch_sessions
    set episode_id = v_episode_id
    where id = v_session.id;

    v_watched_at := coalesce(v_session.watched_at, v_session.last_seen_at, now());
    insert into public.user_media_state (
      user_id, title_id, episode_id, status, progress_percent,
      first_watched_at, last_watched_at, watch_count
    ) values (
      v_session.user_id, v_session.title_id, v_episode_id, 'watched', 100,
      v_watched_at, v_watched_at, 1
    )
    on conflict (user_id, episode_id) where episode_id is not null do update set
      status = 'watched',
      progress_percent = 100,
      first_watched_at = least(coalesce(public.user_media_state.first_watched_at, v_watched_at), v_watched_at),
      last_watched_at = greatest(public.user_media_state.last_watched_at, v_watched_at),
      watch_count = public.user_media_state.watch_count + 1;

    update public.source_mappings
    set title_id = v_session.title_id,
        episode_id = v_episode_id
    where user_id = v_session.user_id
      and provider = v_session.provider
      and provider_item_id = v_session.provider_item_id;
  end loop;

  delete from public.user_media_state as state
  using public.catalog_titles as title
  where state.title_id = title.id
    and state.episode_id is null
    and title.media_type = 'tv'
    and exists (
      select 1
      from public.watch_sessions as session
      where session.user_id = state.user_id
        and session.title_id = state.title_id
        and session.episode_id is not null
    );
end;
$$;
