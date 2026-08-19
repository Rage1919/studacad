-- Studacad prices deposits in Botswana pula and issues exactly one credit per
-- whole BWP received. Provider checkout remains intentionally separate from
-- this server-authoritative ledger foundation.
alter table public.payments
  add constraint payments_bwp_credit_parity
  check (currency = 'BWP' and amount_minor % 100 = 0 and credits = amount_minor / 100);

alter table public.payment_refunds
  add constraint payment_refunds_bwp_credit_parity
  check (amount_minor % 100 = 0 and credits = amount_minor / 100);

create function public.record_verified_deposit(
  p_actor_user_id uuid,
  p_learner_user_id uuid,
  p_amount_bwp integer,
  p_deposit_reference text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction_id uuid;
  v_payment_id uuid;
  v_learner_wallet_id uuid;
  v_issuance_wallet_id uuid;
  v_existing_metadata jsonb;
  v_reference text := trim(p_deposit_reference);
  v_idempotency_key text := trim(p_idempotency_key);
begin
  if p_amount_bwp is null or p_amount_bwp < 1 or p_amount_bwp > 1000000 then
    raise exception 'Deposit amount must be between 1 and 1000000 whole BWP'
      using errcode = '22023';
  end if;
  if length(v_reference) < 4 or length(v_reference) > 100 then
    raise exception 'Deposit reference must be 4 to 100 characters'
      using errcode = '22023';
  end if;
  if length(v_idempotency_key) < 8 or length(v_idempotency_key) > 100 then
    raise exception 'Idempotency key must be 8 to 100 characters'
      using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.user_accounts account
    join public.user_roles role on role.user_id = account.id
    where account.id = p_actor_user_id
      and account.status = 'active'
      and role.role = 'admin'
      and role.revoked_at is null
  ) then
    raise exception 'Only an active administrator may record a verified deposit'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.user_accounts
    where id = p_learner_user_id and status = 'active'
  ) then
    raise exception 'The learner account is not active'
      using errcode = '22023';
  end if;

  select id, metadata into v_transaction_id, v_existing_metadata
  from public.ledger_transactions
  where idempotency_key = v_idempotency_key;
  if v_transaction_id is not null then
    if v_existing_metadata ->> 'learnerUserId' is distinct from p_learner_user_id::text
      or (v_existing_metadata ->> 'amountBwp')::integer is distinct from p_amount_bwp
      or v_existing_metadata ->> 'depositReference' is distinct from v_reference then
      raise exception 'Idempotency key was already used for different deposit details'
        using errcode = '23505';
    end if;
    return v_transaction_id;
  end if;

  insert into public.wallet_accounts (owner_user_id)
  values (p_learner_user_id)
  on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id
  returning id into v_learner_wallet_id;

  insert into public.wallet_accounts (system_code)
  values ('credit_issuance')
  on conflict (system_code) do update set system_code = excluded.system_code
  returning id into v_issuance_wallet_id;

  insert into public.payments (
    user_id, provider, provider_payment_id, status, amount_minor, currency,
    credits, checkout_reference
  ) values (
    p_learner_user_id, 'verified_offline_deposit', v_reference,
    'paid', p_amount_bwp::bigint * 100, 'BWP', p_amount_bwp,
    'offline:' || v_reference
  ) returning id into v_payment_id;

  insert into public.ledger_transactions (
    kind, idempotency_key, description, actor_user_id, metadata
  ) values (
    'topup', v_idempotency_key, 'Verified deposit · ' || v_reference,
    p_actor_user_id,
    jsonb_build_object(
      'paymentId', v_payment_id,
      'learnerUserId', p_learner_user_id,
      'amountBwp', p_amount_bwp,
      'credits', p_amount_bwp,
      'depositReference', v_reference,
      'source', 'verified_offline_deposit'
    )
  ) returning id into v_transaction_id;

  insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits)
  values
    (v_transaction_id, v_issuance_wallet_id, -p_amount_bwp::bigint),
    (v_transaction_id, v_learner_wallet_id, p_amount_bwp::bigint);

  update public.payments
  set ledger_transaction_id = v_transaction_id
  where id = v_payment_id;

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, after_state, metadata
  ) values (
    p_actor_user_id, 'wallet.verified_deposit_recorded', 'ledger_transaction',
    v_transaction_id,
    jsonb_build_object('learnerUserId', p_learner_user_id, 'amountBwp', p_amount_bwp, 'credits', p_amount_bwp),
    jsonb_build_object('depositReference', v_reference, 'paymentId', v_payment_id)
  );

  return v_transaction_id;
end;
$$;

revoke all on function public.record_verified_deposit(uuid, uuid, integer, text, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.record_verified_deposit(uuid, uuid, integer, text, text) to service_role';
  end if;
end;
$$;
