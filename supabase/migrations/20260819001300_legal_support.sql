create table public.policy_documents (
  key text not null check (key in ('privacy','terms','tutor_agreement','community_guidelines','safety','cancellation_refunds','cookies','accessibility')),
  version text not null check (version ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'), title text not null, effective_at timestamptz not null,
  review_due_at timestamptz not null, status text not null check (status in ('current','retired')), content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(), primary key (key,version)
);
create unique index policy_documents_current_unique on public.policy_documents(key) where status='current';
alter table public.policy_documents enable row level security;

insert into public.policy_documents(key,version,title,effective_at,review_due_at,status,content_sha256) values
('privacy','2026-08-20','Privacy Notice','2026-08-20','2027-02-20','current','a424c491ed84f335988cd6a9f4e1f68beece3bc34b89a7f6c96463cbd33411d2'),
('terms','2026-08-20','Terms of Use','2026-08-20','2027-02-20','current','de4e5353564b96cf6bd1bb5d6319f2386d75d55696f500d6722e8506ac7498ef'),
('tutor_agreement','2026-08-20','Tutor Agreement','2026-08-20','2027-02-20','current','f9c4873bc0beacaedaf1c8b041ac476c615ef00951f3ad4cd41d585292ede71c'),
('community_guidelines','2026-08-20','Community Guidelines','2026-08-20','2027-02-20','current','be933f359cf430462b65a97ad0e77ce500777cfc04980bc298d1d2ccdda80dfd'),
('safety','2026-08-20','Safety and Safeguarding','2026-08-20','2027-02-20','current','34716bda88a6701ae29ae10a06d1cee254fc59aac059da1e396a01f7d0bf6b13'),
('cancellation_refunds','2026-08-20','Cancellation and Refund Policy','2026-08-20','2027-02-20','current','6e5d955af81ee3b58165d3cc024255c1cb6c062fa781b91137436e51d28f4df8'),
('cookies','2026-08-20','Cookie Information','2026-08-20','2027-02-20','current','08c5fe7a834b253973ad616fe903cc4373baad6b872552584516c52e64c34ce5'),
('accessibility','2026-08-20','Accessibility Statement','2026-08-20','2027-02-20','current','05fd3243e294ddbe2445e209210eff42fe038bf8011a81ddf08ea08c6e446e9d');

create table public.user_policy_acceptances (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_accounts(id) on delete restrict,
  policy_key text not null, policy_version text not null, context text not null check (context in ('registration','account','booking','course_purchase','tutor_submission')),
  context_reference text not null, accepted_at timestamptz not null default now(), ip_hash text,
  foreign key(policy_key,policy_version) references public.policy_documents(key,version) on delete restrict,
  unique(user_id,policy_key,policy_version,context,context_reference)
);
create index user_policy_acceptances_user_idx on public.user_policy_acceptances(user_id,accepted_at desc);
create trigger user_policy_acceptances_immutable before update or delete on public.user_policy_acceptances for each row execute function public.reject_immutable_mutation();
alter table public.user_policy_acceptances enable row level security;

create table public.policy_reviews (
  id uuid primary key default gen_random_uuid(), policy_version text not null, review_kind text not null check(review_kind in ('owner','legal','privacy','safeguarding','accessibility')),
  reviewer_name text not null check(length(reviewer_name) between 2 and 150), reviewed_by_user_id uuid not null references public.user_accounts(id) on delete restrict,
  outcome text not null check(outcome in ('approved','changes_required')), evidence_reference text not null check(length(evidence_reference) between 4 and 300),
  next_review_at timestamptz not null, created_at timestamptz not null default now()
);
create trigger policy_reviews_immutable before update or delete on public.policy_reviews for each row execute function public.reject_immutable_mutation();
alter table public.policy_reviews enable row level security;

create sequence public.support_case_number_seq start 1000;
create table public.support_cases (
  id uuid primary key default gen_random_uuid(), case_number text not null unique, requester_user_id uuid not null references public.user_accounts(id) on delete restrict,
  category text not null check(category in ('account','booking','payment','tutor','safety','privacy','accessibility','technical','other')),
  subject text not null check(length(subject) between 5 and 150), status text not null default 'open' check(status in ('open','triaged','waiting_on_user','resolved','closed')),
  priority text not null check(priority in ('urgent','high','normal','low')), booking_id uuid references public.bookings(id) on delete restrict,
  assigned_to_user_id uuid references public.user_accounts(id) on delete restrict, response_due_at timestamptz not null,
  resolved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index support_cases_requester_idx on public.support_cases(requester_user_id,created_at desc);
create index support_cases_queue_idx on public.support_cases(status,priority,response_due_at);
create trigger support_cases_set_updated_at before update on public.support_cases for each row execute function public.set_updated_at();
alter table public.support_cases enable row level security;

create table public.support_case_messages (
  id uuid primary key default gen_random_uuid(), support_case_id uuid not null references public.support_cases(id) on delete restrict,
  author_user_id uuid not null references public.user_accounts(id) on delete restrict, body text not null check(length(body) between 5 and 5000),
  internal boolean not null default false, created_at timestamptz not null default now()
);
create trigger support_case_messages_immutable before update or delete on public.support_case_messages for each row execute function public.reject_immutable_mutation();
alter table public.support_case_messages enable row level security;

create table public.tutor_reports (
  id uuid primary key default gen_random_uuid(), reporter_user_id uuid not null references public.user_accounts(id) on delete restrict,
  tutor_profile_id uuid not null references public.tutor_profiles(id) on delete restrict, booking_id uuid references public.bookings(id) on delete restrict,
  reason text not null check(length(reason) between 10 and 2000), status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
  support_case_id uuid not null references public.support_cases(id) on delete restrict, reviewed_by_user_id uuid references public.user_accounts(id) on delete restrict,
  reviewed_at timestamptz, resolution_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(reporter_user_id,tutor_profile_id,booking_id)
);
create index tutor_reports_queue_idx on public.tutor_reports(status,created_at);
create trigger tutor_reports_set_updated_at before update on public.tutor_reports for each row execute function public.set_updated_at();
alter table public.tutor_reports enable row level security;

create function public.accept_current_policies(p_user uuid,p_keys text[],p_context text,p_reference text,p_ip_hash text default null)
returns integer language plpgsql security definer set search_path='' as $$
declare v_key text;v_document public.policy_documents%rowtype;v_count integer:=0;
begin
  if p_context not in ('registration','account','booking','course_purchase','tutor_submission') or length(trim(p_reference)) not between 4 and 150 then raise exception 'Valid policy acceptance context required' using errcode='22023'; end if;
  if not exists(select 1 from public.user_accounts where id=p_user and status='active') then raise exception 'Active account required' using errcode='42501'; end if;
  foreach v_key in array p_keys loop
    select * into v_document from public.policy_documents where key=v_key and status='current';
    if v_document.key is null then raise exception 'Current policy is unavailable' using errcode='P0001'; end if;
    insert into public.user_policy_acceptances(user_id,policy_key,policy_version,context,context_reference,ip_hash)
    values(p_user,v_document.key,v_document.version,p_context,trim(p_reference),p_ip_hash) on conflict do nothing;
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $$;

create function public.create_support_case(p_user uuid,p_category text,p_subject text,p_message text,p_booking uuid default null)
returns text language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_number text;v_priority text;v_due timestamptz;
begin
  if not exists(select 1 from public.user_accounts where id=p_user and status='active') then raise exception 'Active account required' using errcode='42501'; end if;
  if p_category not in ('account','booking','payment','tutor','safety','privacy','accessibility','technical','other') or length(trim(p_subject)) not between 5 and 150 or length(trim(p_message)) not between 10 and 5000 then raise exception 'Complete the support request' using errcode='22023'; end if;
  if p_booking is not null and not exists(select 1 from public.booking_participants where booking_id=p_booking and learner_user_id=p_user union select 1 from public.bookings b join public.tutor_profiles t on t.id=b.tutor_profile_id where b.id=p_booking and t.tutor_user_id=p_user) then raise exception 'Booking not found' using errcode='42501'; end if;
  v_priority:=case when p_category='safety' then 'urgent' else 'normal' end;v_due:=case when p_category='safety' then now()+interval '4 hours' else now()+interval '1 day' end;
  v_number:='STU-'||to_char(now(),'YYYYMM')||'-'||lpad(nextval('public.support_case_number_seq')::text,6,'0');
  insert into public.support_cases(case_number,requester_user_id,category,subject,priority,booking_id,response_due_at) values(v_number,p_user,p_category,trim(p_subject),v_priority,p_booking,v_due) returning id into v_id;
  insert into public.support_case_messages(support_case_id,author_user_id,body) values(v_id,p_user,trim(p_message));
  insert into public.audit_events(actor_user_id,action,entity_type,entity_id,metadata) values(p_user,'support_case.created','support_case',v_id,jsonb_build_object('caseNumber',v_number,'category',p_category,'responseDueAt',v_due));
  perform public.enqueue_user_notification(p_user,'support','support.case_created',jsonb_build_object('caseId',v_id,'caseNumber',v_number),'support-case:'||v_id||':created',true,now());
  return v_number;
end; $$;

create function public.add_support_case_message(p_actor uuid,p_case uuid,p_body text,p_internal boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_case public.support_cases%rowtype;v_admin boolean;v_id uuid;
begin
  select * into v_case from public.support_cases where id=p_case for update;if v_case.id is null then raise exception 'Support case not found' using errcode='P0001';end if;
  select exists(select 1 from public.user_roles where user_id=p_actor and role='admin' and revoked_at is null) into v_admin;
  if not v_admin and (v_case.requester_user_id<>p_actor or p_internal) then raise exception 'Support case access denied' using errcode='42501';end if;
  if length(trim(p_body)) not between 5 and 5000 then raise exception 'Support message must be 5 to 5000 characters' using errcode='22023';end if;
  insert into public.support_case_messages(support_case_id,author_user_id,body,internal) values(p_case,p_actor,trim(p_body),p_internal) returning id into v_id;
  if v_admin and not p_internal then perform public.enqueue_user_notification(v_case.requester_user_id,'support','support.case_updated',jsonb_build_object('caseId',p_case,'caseNumber',v_case.case_number),'support-case:'||p_case||':message:'||v_id,true,now());end if;
  insert into public.audit_events(actor_user_id,action,entity_type,entity_id,metadata) values(p_actor,'support_case.message_added','support_case',p_case,jsonb_build_object('messageId',v_id,'internal',p_internal));return v_id;
end; $$;

create function public.admin_update_support_case(p_actor uuid,p_case uuid,p_status text,p_priority text,p_assignee uuid,p_note text default null)
returns text language plpgsql security definer set search_path='' as $$
declare v_case public.support_cases%rowtype;
begin
  if not exists(select 1 from public.user_roles where user_id=p_actor and role='admin' and revoked_at is null) then raise exception 'Administrator role required' using errcode='42501';end if;
  if p_status not in ('open','triaged','waiting_on_user','resolved','closed') or p_priority not in ('urgent','high','normal','low') then raise exception 'Unsupported support state' using errcode='22023';end if;
  select * into v_case from public.support_cases where id=p_case for update;if v_case.id is null then raise exception 'Support case not found' using errcode='P0001';end if;
  update public.support_cases set status=p_status,priority=p_priority,assigned_to_user_id=p_assignee,resolved_at=case when p_status in ('resolved','closed') then coalesce(resolved_at,now()) else null end where id=p_case;
  if length(trim(coalesce(p_note,'')))>=5 then perform public.add_support_case_message(p_actor,p_case,p_note,false);end if;
  insert into public.audit_events(actor_user_id,action,entity_type,entity_id,before_state,after_state) values(p_actor,'support_case.status_changed','support_case',p_case,jsonb_build_object('status',v_case.status,'priority',v_case.priority),jsonb_build_object('status',p_status,'priority',p_priority,'assignee',p_assignee));
  return p_status;
end; $$;

create function public.report_tutor(p_user uuid,p_tutor_slug text,p_reason text,p_booking uuid default null)
returns text language plpgsql security definer set search_path='' as $$
declare v_profile public.tutor_profiles%rowtype;v_case_number text;v_case_id uuid;v_report uuid;
begin
  select * into v_profile from public.tutor_profiles where slug=trim(p_tutor_slug);if v_profile.id is null then raise exception 'Tutor not found' using errcode='P0001';end if;
  if v_profile.tutor_user_id=p_user or length(trim(p_reason)) not between 10 and 2000 then raise exception 'Valid tutor report required' using errcode='22023';end if;
  if p_booking is not null and not exists(select 1 from public.booking_participants bp join public.bookings b on b.id=bp.booking_id where bp.booking_id=p_booking and bp.learner_user_id=p_user and b.tutor_profile_id=v_profile.id) then raise exception 'Booking not found' using errcode='42501';end if;
  v_case_number:=public.create_support_case(p_user,'tutor','Tutor safety or conduct report',p_reason,p_booking);select id into v_case_id from public.support_cases where case_number=v_case_number;
  insert into public.tutor_reports(reporter_user_id,tutor_profile_id,booking_id,reason,support_case_id) values(p_user,v_profile.id,p_booking,trim(p_reason),v_case_id) returning id into v_report;
  insert into public.audit_events(actor_user_id,action,entity_type,entity_id,metadata) values(p_user,'tutor.reported','tutor_report',v_report,jsonb_build_object('supportCaseId',v_case_id));return v_case_number;
end; $$;

create function public.record_policy_review(p_actor uuid,p_version text,p_kind text,p_reviewer text,p_outcome text,p_evidence text,p_next_review timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid;
begin if not exists(select 1 from public.user_roles where user_id=p_actor and role='admin' and revoked_at is null) then raise exception 'Administrator role required' using errcode='42501';end if;
  if p_kind not in ('owner','legal','privacy','safeguarding','accessibility') or p_outcome not in ('approved','changes_required') or p_next_review<=now() then raise exception 'Valid policy review required' using errcode='22023';end if;
  insert into public.policy_reviews(policy_version,review_kind,reviewer_name,reviewed_by_user_id,outcome,evidence_reference,next_review_at) values(p_version,p_kind,trim(p_reviewer),p_actor,p_outcome,trim(p_evidence),p_next_review) returning id into v_id;
  insert into public.audit_events(actor_user_id,action,entity_type,entity_id,metadata) values(p_actor,'policy.review_recorded','policy_review',v_id,jsonb_build_object('version',p_version,'kind',p_kind,'outcome',p_outcome));return v_id;end; $$;

create function public.accept_tutor_agreement_on_submission() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.status='submitted' and old.status is distinct from new.status and new.consented_at is not null then perform public.accept_current_policies(new.applicant_user_id,array['tutor_agreement','privacy'],'tutor_submission',new.id::text,null);end if;return new;end; $$;
create trigger tutor_applications_accept_policy after update of status on public.tutor_applications for each row execute function public.accept_tutor_agreement_on_submission();

revoke all on function public.accept_current_policies(uuid,text[],text,text,text) from public;
revoke all on function public.create_support_case(uuid,text,text,text,uuid) from public;
revoke all on function public.add_support_case_message(uuid,uuid,text,boolean) from public;
revoke all on function public.admin_update_support_case(uuid,uuid,text,text,uuid,text) from public;
revoke all on function public.report_tutor(uuid,text,text,uuid) from public;
revoke all on function public.record_policy_review(uuid,text,text,text,text,text,timestamptz) from public;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then
 execute 'grant execute on function public.accept_current_policies(uuid,text[],text,text,text) to service_role';execute 'grant execute on function public.create_support_case(uuid,text,text,text,uuid) to service_role';
 execute 'grant execute on function public.add_support_case_message(uuid,uuid,text,boolean) to service_role';execute 'grant execute on function public.admin_update_support_case(uuid,uuid,text,text,uuid,text) to service_role';
 execute 'grant execute on function public.report_tutor(uuid,text,text,uuid) to service_role';execute 'grant execute on function public.record_policy_review(uuid,text,text,text,text,text,timestamptz) to service_role';
end if;end $$;

create or replace function public.sync_auth_user_account()
returns trigger language plpgsql security definer set search_path='' as $$
declare account_id uuid;v_version text;
begin
  if new.email is null then return new;end if;
  insert into public.user_accounts(auth_subject,email,display_name,status,email_verified_at) values(new.id,lower(trim(new.email)),coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),split_part(new.email,'@',1)),case when new.email_confirmed_at is null then 'pending_verification'::public.account_status else 'active'::public.account_status end,new.email_confirmed_at)
  on conflict(auth_subject) do update set email=excluded.email,email_verified_at=excluded.email_verified_at,status=case when public.user_accounts.status in('suspended','deletion_requested','deleted') then public.user_accounts.status else excluded.status end returning id into account_id;
  insert into public.user_roles(user_id,role) values(account_id,'learner') on conflict(user_id,role) do nothing;
  if new.email_confirmed_at is not null and new.raw_user_meta_data->>'studacad_policy_accepted'='true' then
    v_version:=new.raw_user_meta_data->>'studacad_policy_version';
    insert into public.user_policy_acceptances(user_id,policy_key,policy_version,context,context_reference)
    select account_id,document.key,document.version,'registration',new.id::text from public.policy_documents document
    where document.key in('terms','privacy') and document.status='current' and document.version=v_version on conflict do nothing;
  end if;
  return new;
end; $$;
