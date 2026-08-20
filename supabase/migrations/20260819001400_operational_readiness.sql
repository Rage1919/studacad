-- Service-role-only operational counters. The snapshot contains no user content
-- or direct identifiers and is consumed only by the authenticated health probe.
create function public.operational_readiness_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unbalanced_transactions integer;
  v_notification_overdue integer;
  v_notification_dead_letters integer;
  v_message_overdue integer;
  v_message_support integer;
  v_meeting_overdue integer;
  v_meeting_support integer;
  v_failed_webhooks integer;
  v_failed_payouts integer;
  v_clearing bigint;
  v_expected_clearing bigint;
begin
  select count(*)::integer into v_unbalanced_transactions
  from (
    select transaction_id
    from public.ledger_entries
    group by transaction_id
    having sum(amount_credits) <> 0
  ) imbalance;

  select count(*)::integer into v_notification_overdue
  from public.notifications
  where channel = 'email'
    and status in ('pending', 'failed')
    and dead_lettered_at is null
    and coalesce(next_retry_at, scheduled_for) < now() - interval '5 minutes';

  select count(*)::integer into v_notification_dead_letters
  from public.notifications where dead_lettered_at is not null;

  select count(*)::integer into v_message_overdue
  from public.message_deliveries
  where status in ('queued', 'retry_required')
    and coalesce(next_retry_at, created_at) < now() - interval '5 minutes';

  select count(*)::integer into v_message_support
  from public.message_deliveries where status in ('failed', 'support_required');

  select count(*)::integer into v_meeting_overdue
  from public.booking_meetings
  where status in ('pending', 'retry_required')
    and coalesce(next_retry_at, requested_at) < now() - interval '5 minutes';

  select count(*)::integer into v_meeting_support
  from public.booking_meetings where status = 'support_required';

  select count(*)::integer into v_failed_webhooks
  from public.provider_webhook_events where status = 'failed';

  select count(*)::integer into v_failed_payouts
  from public.tutor_payouts where status = 'failed';

  select coalesce(balance.balance_credits, 0) into v_clearing
  from public.wallet_accounts account
  left join public.wallet_balances balance on balance.wallet_account_id = account.id
  where account.system_code = 'payout_clearing';
  v_clearing := coalesce(v_clearing, 0);

  select coalesce(sum(coalesce(credits, amount_minor / 100)), 0)::bigint
  into v_expected_clearing
  from public.tutor_payouts where status in ('requested', 'reviewing', 'processing');

  return jsonb_build_object(
    'database', 'ok',
    'ledgerUnbalancedTransactions', v_unbalanced_transactions,
    'notificationOverdue', v_notification_overdue,
    'notificationDeadLetters', v_notification_dead_letters,
    'messageOverdue', v_message_overdue,
    'messageSupportRequired', v_message_support,
    'meetingOverdue', v_meeting_overdue,
    'meetingSupportRequired', v_meeting_support,
    'failedWebhooks', v_failed_webhooks,
    'failedPayouts', v_failed_payouts,
    'payoutClearingCredits', v_clearing,
    'expectedPayoutClearingCredits', v_expected_clearing,
    'payoutClearingBalanced', v_clearing = v_expected_clearing,
    'measuredAt', now()
  );
end;
$$;

revoke all on function public.operational_readiness_snapshot() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.operational_readiness_snapshot() to service_role;
  end if;
end $$;
