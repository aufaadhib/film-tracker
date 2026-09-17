update public.catalog_titles
set title = 'The King: Eternal Monarch'
where tmdb_id = 93846
  and media_type = 'tv'
  and title = original_title;
