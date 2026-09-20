create function public.get_confirmed_extension_catalog_mapping(
  p_token_hash text,
  p_provider text,
  p_provider_item_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_match jsonb;
begin
  select user_id into v_user_id
  from public.extension_devices
  where token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('authenticated', false);
  end if;

  if p_provider_item_id is not null then
    select jsonb_build_object(
      'tmdbId', title.tmdb_id,
      'mediaType', title.media_type,
      'title', title.title,
      'originalTitle', title.original_title,
      'year', title.release_year,
      'overview', title.overview,
      'posterPath', title.poster_path,
      'backdropPath', title.backdrop_path,
      'voteAverage', title.vote_average,
      'seriesStatus', title.series_status
    ) into v_match
    from public.source_mappings as mapping
    join public.catalog_titles as title on title.id = mapping.title_id
    where mapping.user_id = v_user_id
      and mapping.provider = p_provider
      and mapping.provider_item_id = p_provider_item_id
      and mapping.confirmed_by_user
    limit 1;
  end if;

  return jsonb_build_object('authenticated', true, 'match', v_match);
end;
$$;

revoke all on function public.get_confirmed_extension_catalog_mapping(text, text, text) from public, anon, authenticated;
grant execute on function public.get_confirmed_extension_catalog_mapping(text, text, text) to anon, authenticated;
