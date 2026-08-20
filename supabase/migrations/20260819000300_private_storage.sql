do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'studacad-private',
      'studacad-private',
      false,
      10485760,
      array['application/pdf', 'image/jpeg', 'image/png', 'video/mp4']
    )
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;

-- No storage.objects policy is created here. Publishable clients are denied by
-- default; authenticated, short-lived upload/download access is issued by the
-- server after it checks ownership or reviewer authorization.
