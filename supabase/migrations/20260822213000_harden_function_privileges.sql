alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.reject_immutable_mutation() set search_path = public, pg_temp;
alter function public.prevent_tutor_booking_overlap() set search_path = public, pg_temp;

-- All application RPCs are called from Studacad's server with the service role.
-- Remove Postgres' default function execution grant so browser clients cannot
-- invoke SECURITY DEFINER routines directly through the REST API.
do $$
declare
  function_signature text;
begin
  for function_signature in
    select format(
      '%I.%I(%s)',
      namespace.nspname,
      procedure.proname,
      pg_get_function_identity_arguments(procedure.oid)
    )
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      function_signature
    );

    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format(
        'grant execute on function %s to service_role',
        function_signature
      );
    end if;
  end loop;
end;
$$;
