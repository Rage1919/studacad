alter table public.notifications add column template_version integer not null default 1 check (template_version > 0);
alter table public.notifications add column event_key text not null default 'legacy';
alter table public.notifications add column essential boolean not null default true;
alter table public.notifications add column locale text not null default 'en-BW';
alter table public.notifications add column recipient_timezone text not null default 'Africa/Gaborone';
alter table public.notifications add column attempt_count integer not null default 0 check (attempt_count between 0 and 5);
alter table public.notifications add column next_retry_at timestamptz;
alter table public.notifications add column last_attempt_at timestamptz;
alter table public.notifications add column claimed_at timestamptz;
alter table public.notifications add column claim_token uuid;
alter table public.notifications add column provider_message_id text;
alter table public.notifications add column delivered_at timestamptz;
alter table public.notifications add column dead_lettered_at timestamptz;
alter table public.notifications add column delivery_disposition text check (delivery_disposition in ('delivered','preference_disabled','provider_suppressed','booking_changed','booking_cancelled'));
create unique index notifications_provider_message_unique on public.notifications (channel, provider_message_id) where provider_message_id is not null;
create index notifications_claim_idx on public.notifications (status, next_retry_at, scheduled_for, created_at) where dead_lettered_at is null;

create table public.notification_preferences (
  user_id uuid not null references public.user_accounts(id) on delete cascade,
  category text not null check (category in ('booking_reminder','new_message')),
  channel text not null check (channel = 'email'), enabled boolean not null default true,
  updated_at timestamptz not null default now(), primary key (user_id, category, channel)
);
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();
alter table public.notification_preferences enable row level security;

create table public.notification_suppressions (
  user_id uuid not null references public.user_accounts(id) on delete cascade,
  channel text not null check (channel = 'email'), reason text not null check (reason in ('bounce','complaint','manual')),
  provider_event_id text not null, created_at timestamptz not null default now(), primary key (user_id, channel)
);
alter table public.notification_suppressions enable row level security;

create function public.enqueue_user_notification(p_user uuid, p_category text, p_template text, p_payload jsonb, p_event_key text, p_essential boolean, p_scheduled_for timestamptz default now())
returns integer language plpgsql security definer set search_path = '' as $$
declare v_account public.user_accounts%rowtype; v_count integer := 0; v_channel text;
begin
  select * into v_account from public.user_accounts where id = p_user and status = 'active';
  if v_account.id is null then return 0; end if;
  if length(trim(p_event_key)) < 4 or length(trim(p_template)) < 4 then raise exception 'Notification event and template are required' using errcode = '22023'; end if;
  foreach v_channel in array array['in_app','email'] loop
    insert into public.notifications (user_id, category, template_key, channel, status, payload, idempotency_key, event_key, essential, locale, recipient_timezone, scheduled_for, sent_at, delivered_at, delivery_disposition)
    values (p_user, p_category, p_template, v_channel, case when v_channel='in_app' and p_scheduled_for<=now() then 'sent'::public.notification_status else 'pending'::public.notification_status end,
      p_payload, p_event_key || ':' || v_channel, p_event_key, p_essential, 'en-BW', v_account.timezone, greatest(p_scheduled_for, now()),
      case when v_channel='in_app' and p_scheduled_for<=now() then now() else null end, case when v_channel='in_app' and p_scheduled_for<=now() then now() else null end, case when v_channel='in_app' and p_scheduled_for<=now() then 'delivered' else null end)
    on conflict (idempotency_key) do nothing;
    get diagnostics v_count = row_count;
  end loop;
  return v_count;
end; $$;

create function public.set_notification_preference(p_user uuid, p_category text, p_channel text, p_enabled boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_category not in ('booking_reminder','new_message') or p_channel <> 'email' then raise exception 'Essential notifications cannot be disabled' using errcode = '22023'; end if;
  insert into public.notification_preferences (user_id, category, channel, enabled) values (p_user,p_category,p_channel,p_enabled)
  on conflict (user_id,category,channel) do update set enabled=excluded.enabled;
  insert into public.audit_events (actor_user_id,action,entity_type,entity_id,metadata) values (p_user,'notification.preference_changed','user_account',p_user,jsonb_build_object('category',p_category,'channel',p_channel,'enabled',p_enabled));
  return p_enabled;
end; $$;

create function public.claim_notifications(p_limit integer, p_claim_token uuid)
returns setof public.notifications language plpgsql security definer set search_path = '' as $$
begin
  if p_limit not between 1 and 100 then raise exception 'Claim limit must be 1 to 100' using errcode = '22023'; end if;
  update public.notifications notification set status='sent',sent_at=now(),delivery_disposition='preference_disabled'
  where notification.channel='email' and notification.essential=false and notification.status in ('pending','failed') and notification.scheduled_for<=now()
    and exists (select 1 from public.notification_preferences preference where preference.user_id=notification.user_id and preference.category=notification.category and preference.channel='email' and preference.enabled=false);
  update public.notifications notification set status='sent',sent_at=now(),delivery_disposition='provider_suppressed'
  where notification.channel='email' and notification.status in ('pending','failed') and notification.scheduled_for<=now()
    and exists (select 1 from public.notification_suppressions suppression where suppression.user_id=notification.user_id and suppression.channel='email');
  return query
  with candidates as (
    select id from public.notifications where dead_lettered_at is null and scheduled_for<=now()
      and (status='pending' or (status='failed' and next_retry_at<=now()))
      and (claimed_at is null or claimed_at < now()-interval '10 minutes') order by scheduled_for,created_at for update skip locked limit p_limit
  ), claimed as (
    update public.notifications notification set claimed_at=now(),claim_token=p_claim_token,attempt_count=attempt_count+1,last_attempt_at=now()
    from candidates where notification.id=candidates.id returning notification.*
  ) select * from claimed;
end; $$;

create function public.complete_notification(p_id uuid,p_claim_token uuid,p_outcome text,p_provider_message_id text default null,p_error text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_notification public.notifications%rowtype;
begin
  select * into v_notification from public.notifications where id=p_id and claim_token=p_claim_token for update;
  if v_notification.id is null then return false; end if;
  if p_outcome='sent' then
    update public.notifications set status='sent',sent_at=now(),delivered_at=case when channel='in_app' then now() else delivered_at end,
      provider_message_id=nullif(trim(coalesce(p_provider_message_id,'')),''),failure_reason=null,next_retry_at=null,claimed_at=null,claim_token=null,delivery_disposition='delivered' where id=p_id;
  elsif p_outcome='retry' then
    update public.notifications set status='failed',failure_reason=left(coalesce(p_error,'provider_failure'),500),
      next_retry_at=case when attempt_count>=5 then null else now()+make_interval(secs=>least(3600,(30*power(2,attempt_count))::integer)) end,
      dead_lettered_at=case when attempt_count>=5 then now() else null end,claimed_at=null,claim_token=null where id=p_id;
  else raise exception 'Unsupported notification outcome' using errcode='22023'; end if;
  return true;
end; $$;

create function public.mark_notification_read(p_user uuid,p_id uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.notifications set status='read',read_at=now() where id=p_id and user_id=p_user and channel='in_app' and status in ('sent','read');
  return found;
end; $$;

create function public.notify_booking_participant() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id=new.booking_id;
  perform public.enqueue_user_notification(new.learner_user_id,'booking','booking.confirmed',jsonb_build_object('bookingId',v_booking.id,'subject',v_booking.subject,'startsAt',v_booking.starts_at,'format',v_booking.format),'booking:'||v_booking.id||':confirmed:'||new.learner_user_id,true,now());
  perform public.enqueue_user_notification(new.learner_user_id,'booking_reminder','booking.reminder_24h',jsonb_build_object('bookingId',v_booking.id,'subject',v_booking.subject,'startsAt',v_booking.starts_at),'booking:'||v_booking.id||':reminder24:'||new.learner_user_id||':'||extract(epoch from v_booking.starts_at),false,v_booking.starts_at-interval '24 hours');
  perform public.enqueue_user_notification(new.learner_user_id,'booking_reminder','booking.reminder_1h',jsonb_build_object('bookingId',v_booking.id,'subject',v_booking.subject,'startsAt',v_booking.starts_at),'booking:'||v_booking.id||':reminder1:'||new.learner_user_id||':'||extract(epoch from v_booking.starts_at),false,v_booking.starts_at-interval '1 hour');
  return new;
end; $$;
create trigger booking_participants_notify after insert on public.booking_participants for each row execute function public.notify_booking_participant();

create function public.notify_booking_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_tutor uuid; v_cancelled boolean;
begin
  select tutor_user_id into v_tutor from public.tutor_profiles where id=new.tutor_profile_id;
  v_cancelled := new.status in ('cancelled_by_learner','cancelled_by_tutor','refunded');
  if new.starts_at is distinct from old.starts_at or v_cancelled then
    update public.notifications set status='failed',failure_reason=case when v_cancelled then 'booking_cancelled' else 'booking_rescheduled' end,
      next_retry_at=null,dead_lettered_at=now(),delivery_disposition=case when v_cancelled then 'booking_cancelled' else 'booking_changed' end
    where payload->>'bookingId'=new.id::text and category='booking_reminder' and status in ('pending','failed');
    for v_user in select learner_user_id from public.booking_participants where booking_id=new.id loop
      if v_cancelled then
        perform public.enqueue_user_notification(v_user,'booking','booking.cancelled',jsonb_build_object('bookingId',new.id,'subject',new.subject,'startsAt',new.starts_at),'booking:'||new.id||':cancelled:'||v_user,true,now());
      else
        perform public.enqueue_user_notification(v_user,'booking','booking.rescheduled',jsonb_build_object('bookingId',new.id,'subject',new.subject,'startsAt',new.starts_at),'booking:'||new.id||':rescheduled:'||v_user||':'||extract(epoch from new.starts_at),true,now());
        perform public.enqueue_user_notification(v_user,'booking_reminder','booking.reminder_24h',jsonb_build_object('bookingId',new.id,'subject',new.subject,'startsAt',new.starts_at),'booking:'||new.id||':reminder24:'||v_user||':'||extract(epoch from new.starts_at),false,new.starts_at-interval '24 hours');
        perform public.enqueue_user_notification(v_user,'booking_reminder','booking.reminder_1h',jsonb_build_object('bookingId',new.id,'subject',new.subject,'startsAt',new.starts_at),'booking:'||new.id||':reminder1:'||v_user||':'||extract(epoch from new.starts_at),false,new.starts_at-interval '1 hour');
      end if;
    end loop;
    perform public.enqueue_user_notification(v_tutor,'booking',case when v_cancelled then 'booking.cancelled' else 'booking.rescheduled' end,jsonb_build_object('bookingId',new.id,'subject',new.subject,'startsAt',new.starts_at),'booking:'||new.id||':'||case when v_cancelled then 'cancelled:' else 'rescheduled:' end||v_tutor||':'||extract(epoch from new.starts_at),true,now());
  end if;
  return new;
end; $$;
create trigger bookings_notify_change after update of starts_at,status on public.bookings for each row execute function public.notify_booking_change();

create function public.notify_meet_ready() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings%rowtype; v_user uuid; v_tutor uuid;
begin
  if new.status='ready' and old.status is distinct from new.status then
    select * into v_booking from public.bookings where id=new.booking_id;
    select tutor_user_id into v_tutor from public.tutor_profiles where id=v_booking.tutor_profile_id;
    for v_user in select learner_user_id from public.booking_participants where booking_id=new.booking_id and cancelled_at is null loop
      perform public.enqueue_user_notification(v_user,'meeting','meeting.ready',jsonb_build_object('bookingId',new.booking_id,'startsAt',v_booking.starts_at),'meeting:'||new.booking_id||':ready:'||v_user,true,greatest(now(),v_booking.starts_at-interval '24 hours'));
    end loop;
    perform public.enqueue_user_notification(v_tutor,'meeting','meeting.ready',jsonb_build_object('bookingId',new.booking_id,'startsAt',v_booking.starts_at),'meeting:'||new.booking_id||':ready:'||v_tutor,true,greatest(now(),v_booking.starts_at-interval '24 hours'));
  end if; return new;
end; $$;
create trigger booking_meetings_notify_ready after update of status on public.booking_meetings for each row execute function public.notify_meet_ready();

create function public.notify_new_message() returns trigger language plpgsql security definer set search_path = '' as $$ declare v_user uuid; v_sender text;
begin
  select display_name into v_sender from public.user_accounts where id=new.sender_user_id;
  for v_user in select user_id from public.conversation_participants where conversation_id=new.conversation_id and user_id<>new.sender_user_id and left_at is null loop
    perform public.enqueue_user_notification(v_user,'new_message','message.received',jsonb_build_object('conversationId',new.conversation_id,'senderName',v_sender),'message:'||new.id||':'||v_user,false,now());
  end loop; return new;
end; $$;
create trigger messages_notify after insert on public.messages for each row execute function public.notify_new_message();

create function public.notify_tutor_application() returns trigger language plpgsql security definer set search_path = '' as $$
begin if new.status is distinct from old.status then perform public.enqueue_user_notification(new.applicant_user_id,'tutor_application','tutor_application.'||new.status,jsonb_build_object('applicationId',new.id,'status',new.status),'tutor-application:'||new.id||':'||new.status,true,now()); end if; return new; end; $$;
create trigger tutor_applications_notify after update of status on public.tutor_applications for each row execute function public.notify_tutor_application();

create function public.notify_finance_event() returns trigger language plpgsql security definer set search_path = '' as $$ declare v_user uuid;
begin
  if tg_table_name='tutor_payouts' then perform public.enqueue_user_notification(new.tutor_user_id,'payout','payout.'||new.status,jsonb_build_object('payoutId',new.id,'credits',new.credits,'status',new.status),'payout:'||new.id||':'||new.status||':'||new.attempt_count,true,now());
  elsif tg_table_name='booking_refunds' then perform public.enqueue_user_notification(new.learner_user_id,'refund','booking.refunded',jsonb_build_object('bookingId',new.booking_id,'credits',new.credits),'booking-refund:'||new.id,true,now());
  elsif tg_table_name='ledger_transactions' and new.kind='topup' then v_user := (new.metadata->>'learnerUserId')::uuid; perform public.enqueue_user_notification(v_user,'payment','payment.deposit_recorded',jsonb_build_object('transactionId',new.id,'credits',(new.metadata->>'credits')::integer),'deposit:'||new.id,true,now());
  end if; return new;
end; $$;
create trigger tutor_payouts_notify after insert or update of status on public.tutor_payouts for each row execute function public.notify_finance_event();
create trigger booking_refunds_notify after insert on public.booking_refunds for each row execute function public.notify_finance_event();
create trigger ledger_transactions_notify_topup after insert on public.ledger_transactions for each row execute function public.notify_finance_event();

revoke all on function public.enqueue_user_notification(uuid,text,text,jsonb,text,boolean,timestamptz) from public;
revoke all on function public.set_notification_preference(uuid,text,text,boolean) from public;
revoke all on function public.claim_notifications(integer,uuid) from public;
revoke all on function public.complete_notification(uuid,uuid,text,text,text) from public;
revoke all on function public.mark_notification_read(uuid,uuid) from public;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then
  execute 'grant execute on function public.enqueue_user_notification(uuid,text,text,jsonb,text,boolean,timestamptz) to service_role';
  execute 'grant execute on function public.set_notification_preference(uuid,text,text,boolean) to service_role';
  execute 'grant execute on function public.claim_notifications(integer,uuid) to service_role';
  execute 'grant execute on function public.complete_notification(uuid,uuid,text,text,text) to service_role';
  execute 'grant execute on function public.mark_notification_read(uuid,uuid) to service_role';
end if; end $$;
