create function public.correct_unmatched_watch(
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

  update public.watch_sessions
  set title_id = v_title_id,
      metadata = metadata || jsonb_build_object('catalog_matched', true, 'corrected_by_user', true)
  where id = v_session.id;

  v_watched_at := coalesce(v_session.watched_at, v_session.last_seen_at, now());
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

  if v_session.provider_item_id is not null then
    insert into public.source_mappings (
      user_id, provider, provider_item_id, title_id, confidence, confirmed_by_user
    ) values (
      v_user_id, v_session.provider, v_session.provider_item_id, v_title_id, 1, true
    )
    on conflict (user_id, provider, provider_item_id) do update set
      title_id = excluded.title_id,
      confidence = 1,
      confirmed_by_user = true;
  end if;

  return true;
end;
$$;

revoke all on function public.correct_unmatched_watch(uuid, integer, text, text, text, integer, text, text, text, numeric) from public, anon;
grant execute on function public.correct_unmatched_watch(uuid, integer, text, text, text, integer, text, text, text, numeric) to authenticated;
