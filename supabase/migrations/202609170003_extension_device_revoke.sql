create function public.revoke_extension_device(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if char_length(p_token_hash) <> 64 then
    return false;
  end if;

  delete from public.extension_devices
  where token_hash = p_token_hash;

  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

revoke all on function public.revoke_extension_device(text) from public, anon, authenticated;
grant execute on function public.revoke_extension_device(text) to anon, authenticated;
