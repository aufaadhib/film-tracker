create function public.delete_watched_title(p_state_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_title_id uuid;
begin
  if v_user_id is null then
    return false;
  end if;

  select title_id into v_title_id
  from public.user_media_state
  where id = p_state_id
    and user_id = v_user_id
    and episode_id is null;

  if not found then
    return false;
  end if;

  delete from public.watch_sessions
  where user_id = v_user_id
    and title_id = v_title_id;

  delete from public.user_media_state
  where id = p_state_id
    and user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.delete_watched_title(uuid) from public, anon;
grant execute on function public.delete_watched_title(uuid) to authenticated;
