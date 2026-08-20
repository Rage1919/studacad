create function public.sync_auth_user_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid;
begin
  if new.email is null then
    return new;
  end if;

  insert into public.user_accounts (
    auth_subject,
    email,
    display_name,
    status,
    email_verified_at
  ) values (
    new.id,
    lower(trim(new.email)),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    case when new.email_confirmed_at is null then 'pending_verification'::public.account_status else 'active'::public.account_status end,
    new.email_confirmed_at
  )
  on conflict (auth_subject) do update
    set email = excluded.email,
        email_verified_at = excluded.email_verified_at,
        status = case
          when public.user_accounts.status in ('suspended', 'deletion_requested', 'deleted') then public.user_accounts.status
          else excluded.status
        end
  returning id into account_id;

  insert into public.user_roles (user_id, role)
  values (account_id, 'learner')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

do $$
begin
  if to_regclass('auth.users') is not null then
    execute 'drop trigger if exists studacad_sync_auth_user on auth.users';
    execute $trigger$
      create trigger studacad_sync_auth_user
      after insert or update of email_confirmed_at, email on auth.users
      for each row execute function public.sync_auth_user_account()
    $trigger$;
  end if;
end;
$$;

-- Role grants remain server-only. No client policy permits inserting, updating,
-- or deleting user_roles, and the admin bootstrap script writes an audit event.
