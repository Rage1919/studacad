alter table public.tutor_applications
  add column parent_application_id uuid references public.tutor_applications(id) on delete restrict,
  add column phone_e164 text,
  add column district text,
  add column headline text,
  add column teaching_experience text,
  add column languages text[] not null default '{}',
  add column session_duration_minutes integer,
  add column availability jsonb not null default '{}'::jsonb;

alter table public.tutor_applications
  add constraint tutor_applications_phone_e164 check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  add constraint tutor_applications_session_duration check (session_duration_minutes is null or session_duration_minutes in (30, 45, 60, 90)),
  add constraint tutor_applications_availability_object check (jsonb_typeof(availability) = 'object');

create unique index tutor_applications_one_open_per_applicant
on public.tutor_applications (applicant_user_id)
where status in ('draft', 'submitted', 'under_review', 'changes_requested');

create unique index tutor_application_documents_one_type
on public.tutor_application_documents (application_id, document_type);

create function public.save_tutor_application(
  p_applicant_user_id uuid,
  p_application_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application_id uuid;
  v_application public.tutor_applications%rowtype;
  v_parent_id uuid;
begin
  if not exists (
    select 1 from public.user_accounts
    where id = p_applicant_user_id and status = 'active' and deleted_at is null
  ) then
    raise exception 'Active applicant account required' using errcode = '42501';
  end if;

  if p_application_id is null then
    if exists (
      select 1 from public.tutor_applications
      where applicant_user_id = p_applicant_user_id
        and status in ('draft', 'submitted', 'under_review', 'changes_requested')
    ) then
      raise exception 'An open tutor application already exists' using errcode = '23505';
    end if;
    select id into v_parent_id
    from public.tutor_applications
    where applicant_user_id = p_applicant_user_id and status = 'approved'
    order by reviewed_at desc nulls last, created_at desc
    limit 1;

    insert into public.tutor_applications (applicant_user_id, parent_application_id)
    values (p_applicant_user_id, v_parent_id)
    returning id into v_application_id;
    if v_parent_id is not null then
      insert into public.tutor_application_documents (application_id, file_id, document_type)
      select v_application_id, documents.file_id, documents.document_type
      from public.tutor_application_documents documents
      join public.object_files files on files.id = documents.file_id
      where documents.application_id = v_parent_id and files.scan_status = 'clean' and files.deleted_at is null;
    end if;
  else
    select * into v_application
    from public.tutor_applications
    where id = p_application_id
    for update;
    if not found or v_application.applicant_user_id <> p_applicant_user_id then
      raise exception 'Tutor application not found' using errcode = '42501';
    end if;
    if v_application.status not in ('draft', 'changes_requested') then
      raise exception 'Tutor application is not editable in its current state' using errcode = '55000';
    end if;
    v_application_id := p_application_id;
  end if;

  update public.tutor_applications
  set legal_name = nullif(trim(p_payload ->> 'legalName'), ''),
      phone_e164 = nullif(trim(p_payload ->> 'phoneE164'), ''),
      district = nullif(trim(p_payload ->> 'district'), ''),
      location = nullif(trim(p_payload ->> 'town'), ''),
      headline = nullif(trim(p_payload ->> 'headline'), ''),
      biography = nullif(trim(p_payload ->> 'biography'), ''),
      teaching_experience = nullif(trim(p_payload ->> 'teachingExperience'), ''),
      languages = coalesce(array(select jsonb_array_elements_text(coalesce(p_payload -> 'languages', '[]'::jsonb))), '{}'),
      base_price_credits = case when coalesce(p_payload ->> 'basePriceCredits', '') ~ '^[0-9]+$' then (p_payload ->> 'basePriceCredits')::integer else null end,
      session_duration_minutes = case when coalesce(p_payload ->> 'sessionDurationMinutes', '') ~ '^[0-9]+$' then (p_payload ->> 'sessionDurationMinutes')::integer else null end,
      availability = jsonb_build_object(
        'days', coalesce(p_payload -> 'days', '[]'::jsonb),
        'startTime', coalesce(p_payload ->> 'startTime', ''),
        'endTime', coalesce(p_payload ->> 'endTime', '')
      ),
      consented_at = case when coalesce((p_payload ->> 'consent')::boolean, false) then now() else null end
  where id = v_application_id;

  delete from public.tutor_application_subjects where application_id = v_application_id;
  insert into public.tutor_application_subjects (application_id, examination, subject)
  select v_application_id, (item ->> 'examination')::public.exam_level, trim(item ->> 'subject')
  from jsonb_array_elements(coalesce(p_payload -> 'subjectEntries', '[]'::jsonb)) item
  where item ->> 'examination' in ('PSLE', 'JCE', 'BGCSE')
    and length(trim(item ->> 'subject')) between 1 and 80
  on conflict do nothing;

  delete from public.tutor_application_formats where application_id = v_application_id;
  insert into public.tutor_application_formats (application_id, format)
  select v_application_id, value::public.session_format
  from jsonb_array_elements_text(coalesce(p_payload -> 'formats', '[]'::jsonb)) value
  where value in ('online_1to1', 'online_group', 'tutor_place', 'student_place')
  on conflict do nothing;

  delete from public.tutor_qualifications where application_id = v_application_id;
  if nullif(trim(p_payload ->> 'qualification'), '') is not null
    and nullif(trim(p_payload ->> 'institution'), '') is not null then
    insert into public.tutor_qualifications (application_id, qualification_type, institution, title)
    values (
      v_application_id,
      'highest_qualification',
      trim(p_payload ->> 'institution'),
      trim(p_payload ->> 'qualification')
    );
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (p_applicant_user_id, 'tutor_application.saved', 'tutor_application', v_application_id, jsonb_build_object('status', 'draft'));
  return v_application_id;
end;
$$;

create function public.register_tutor_application_document(
  p_applicant_user_id uuid,
  p_application_id uuid,
  p_document_type text,
  p_kind public.object_kind,
  p_object_key text,
  p_original_filename text,
  p_content_type text,
  p_size_bytes bigint,
  p_checksum_sha256 text,
  p_scan_provider_reference text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_file_id uuid;
begin
  if p_document_type not in ('identity', 'qualification', 'profile_image') then
    raise exception 'Unsupported tutor document type' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.tutor_applications
    where id = p_application_id
      and applicant_user_id = p_applicant_user_id
      and status in ('draft', 'changes_requested')
  ) then
    raise exception 'Tutor application is not editable' using errcode = '42501';
  end if;

  update public.object_files files
  set deleted_at = now(), retention_until = least(coalesce(retention_until, now() + interval '30 days'), now() + interval '30 days')
  from public.tutor_application_documents documents
  where documents.application_id = p_application_id
    and documents.document_type = p_document_type
    and files.id = documents.file_id;
  delete from public.tutor_application_documents
  where application_id = p_application_id and document_type = p_document_type;

  insert into public.object_files (
    owner_user_id, kind, object_key, original_filename, content_type, size_bytes,
    checksum_sha256, scan_status, scan_provider_reference, retention_until
  ) values (
    p_applicant_user_id, p_kind, p_object_key, left(p_original_filename, 240), p_content_type, p_size_bytes,
    p_checksum_sha256, 'clean', left(p_scan_provider_reference, 240), now() + interval '90 days'
  ) returning id into v_file_id;

  insert into public.tutor_application_documents (application_id, file_id, document_type)
  values (p_application_id, v_file_id, p_document_type);
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (p_applicant_user_id, 'tutor_application.document_uploaded', 'tutor_application', p_application_id, jsonb_build_object('documentType', p_document_type, 'fileId', v_file_id));
  return v_file_id;
end;
$$;

create function public.transition_tutor_application(
  p_actor_user_id uuid,
  p_application_id uuid,
  p_target_status public.tutor_application_status,
  p_internal_note text default null,
  p_applicant_message text default null
)
returns public.tutor_application_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.tutor_applications%rowtype;
  v_is_admin boolean;
  v_is_applicant boolean;
  v_allowed boolean := false;
  v_profile_id uuid;
  v_profile_image_id uuid;
  v_slug text;
begin
  select * into v_application
  from public.tutor_applications
  where id = p_application_id
  for update;
  if not found then raise exception 'Tutor application not found' using errcode = 'P0002'; end if;

  v_is_applicant := v_application.applicant_user_id = p_actor_user_id;
  select exists (
    select 1 from public.user_roles roles
    join public.user_accounts accounts on accounts.id = roles.user_id
    where roles.user_id = p_actor_user_id and roles.role = 'admin' and roles.revoked_at is null
      and accounts.status = 'active' and accounts.deleted_at is null
  ) into v_is_admin;

  v_allowed :=
    (v_is_applicant and v_application.status = 'draft' and p_target_status in ('submitted', 'withdrawn')) or
    (v_is_applicant and v_application.status = 'changes_requested' and p_target_status in ('submitted', 'withdrawn')) or
    (v_is_applicant and v_application.status in ('submitted', 'under_review') and p_target_status = 'withdrawn') or
    (v_is_admin and v_application.status = 'submitted' and p_target_status = 'under_review') or
    (v_is_admin and v_application.status = 'under_review' and p_target_status in ('changes_requested', 'approved', 'rejected')) or
    (v_is_admin and v_application.status = 'approved' and p_target_status = 'suspended') or
    (v_is_admin and v_application.status = 'suspended' and p_target_status = 'approved');
  if not v_allowed then raise exception 'Invalid or unauthorized tutor application transition' using errcode = '42501'; end if;

  if p_target_status = 'submitted' then
    if v_application.legal_name is null or length(v_application.legal_name) < 2
      or v_application.phone_e164 is null or v_application.headline is null or length(v_application.headline) < 20
      or v_application.biography is null or length(v_application.biography) < 80
      or v_application.location is null or v_application.district is null
      or v_application.teaching_experience is null or cardinality(v_application.languages) = 0
      or v_application.base_price_credits is null or v_application.base_price_credits < 50
      or v_application.session_duration_minutes is null or v_application.consented_at is null
      or jsonb_array_length(coalesce(v_application.availability -> 'days', '[]'::jsonb)) = 0
      or coalesce(v_application.availability ->> 'startTime', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(v_application.availability ->> 'endTime', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or v_application.availability ->> 'startTime' >= v_application.availability ->> 'endTime'
      or not exists (select 1 from public.tutor_application_subjects where application_id = p_application_id)
      or not exists (select 1 from public.tutor_application_formats where application_id = p_application_id)
      or not exists (select 1 from public.tutor_qualifications where application_id = p_application_id)
      or (select count(distinct documents.document_type)
          from public.tutor_application_documents documents
          join public.object_files files on files.id = documents.file_id
          where documents.application_id = p_application_id and files.scan_status = 'clean' and files.deleted_at is null
            and documents.document_type in ('identity', 'qualification', 'profile_image')) <> 3 then
      raise exception 'Tutor application is incomplete or has unverified documents' using errcode = '23514';
    end if;
  end if;

  if p_target_status in ('changes_requested', 'rejected') and nullif(trim(p_applicant_message), '') is null then
    raise exception 'An applicant-facing explanation is required' using errcode = '23514';
  end if;

  update public.tutor_applications
  set status = p_target_status,
      version = case when status = 'changes_requested' and p_target_status = 'submitted' then version + 1 else version end,
      submitted_at = case when p_target_status = 'submitted' then now() else submitted_at end,
      reviewed_at = case when v_is_admin and p_target_status in ('changes_requested', 'approved', 'rejected', 'suspended') then now() else reviewed_at end,
      withdrawn_at = case when p_target_status = 'withdrawn' then now() else withdrawn_at end
  where id = p_application_id;

  if v_is_admin then
    insert into public.tutor_application_reviews (
      application_id, reviewer_user_id, from_status, to_status, internal_note, applicant_message
    ) values (
      p_application_id, p_actor_user_id, v_application.status, p_target_status,
      nullif(trim(p_internal_note), ''), nullif(trim(p_applicant_message), '')
    );
  end if;

  if p_target_status = 'approved' then
    select documents.file_id into v_profile_image_id
    from public.tutor_application_documents documents
    join public.object_files files on files.id = documents.file_id
    where documents.application_id = p_application_id and documents.document_type = 'profile_image'
      and files.scan_status = 'clean' and files.deleted_at is null;
    select regexp_replace(lower(display_name), '[^a-z0-9]+', '-', 'g') || '-' || left(replace(p_application_id::text, '-', ''), 8)
    into v_slug from public.user_accounts where id = v_application.applicant_user_id;

    insert into public.tutor_profiles (
      tutor_user_id, approved_application_id, status, slug, headline, about, location,
      timezone, base_price_credits, profile_image_file_id, published_at
    ) values (
      v_application.applicant_user_id, p_application_id, 'active', trim(both '-' from v_slug),
      v_application.headline, v_application.biography, v_application.location,
      v_application.timezone, v_application.base_price_credits, v_profile_image_id, now()
    )
    on conflict (tutor_user_id) do update
      set approved_application_id = excluded.approved_application_id,
          status = 'active', headline = excluded.headline, about = excluded.about,
          location = excluded.location, timezone = excluded.timezone,
          base_price_credits = excluded.base_price_credits,
          profile_image_file_id = excluded.profile_image_file_id,
          published_at = now()
    returning id into v_profile_id;

    delete from public.tutor_profile_subjects where tutor_profile_id = v_profile_id;
    insert into public.tutor_profile_subjects (tutor_profile_id, examination, subject, price_credits)
    select v_profile_id, examination, subject, v_application.base_price_credits
    from public.tutor_application_subjects where application_id = p_application_id;
    delete from public.tutor_profile_formats where tutor_profile_id = v_profile_id;
    insert into public.tutor_profile_formats (tutor_profile_id, format)
    select v_profile_id, format from public.tutor_application_formats where application_id = p_application_id;
    insert into public.user_roles (user_id, role, granted_by)
    values (v_application.applicant_user_id, 'tutor', p_actor_user_id)
    on conflict (user_id, role) do update
      set revoked_at = null, granted_by = excluded.granted_by, granted_at = now();
    update public.object_files files
    set retention_until = case when files.kind = 'profile_image' then null else now() + interval '2 years' end
    from public.tutor_application_documents documents
    where documents.application_id = p_application_id and files.id = documents.file_id;
  elsif p_target_status = 'suspended' then
    update public.tutor_profiles set status = 'suspended' where approved_application_id = p_application_id;
    update public.user_roles set revoked_at = now()
    where user_id = v_application.applicant_user_id and role = 'tutor' and revoked_at is null;
  elsif p_target_status in ('rejected', 'withdrawn') then
    update public.object_files files set retention_until = now() + interval '30 days'
    from public.tutor_application_documents documents
    where documents.application_id = p_application_id and files.id = documents.file_id;
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, before_state, after_state, metadata)
  values (
    p_actor_user_id, 'tutor_application.status_changed', 'tutor_application', p_application_id,
    jsonb_build_object('status', v_application.status), jsonb_build_object('status', p_target_status),
    jsonb_build_object('applicantMessage', nullif(trim(p_applicant_message), ''))
  );
  return p_target_status;
end;
$$;

create function public.finalize_expired_object_deletion(p_file_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_file public.object_files%rowtype;
begin
  select * into v_file from public.object_files where id = p_file_id for update;
  if not found or v_file.deleted_at is not null or v_file.retention_until is null or v_file.retention_until > now() then
    return false;
  end if;
  update public.object_files set deleted_at = now() where id = p_file_id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, before_state, after_state, metadata)
  values (
    null, 'storage.retention_deleted', 'object_file', p_file_id,
    jsonb_build_object('retentionUntil', v_file.retention_until), jsonb_build_object('deletedAt', now()),
    jsonb_build_object('kind', v_file.kind, 'ownerUserId', v_file.owner_user_id)
  );
  return true;
end;
$$;

create view public.public_tutor_marketplace_profiles
with (security_invoker = true)
as
select
  profiles.id,
  profiles.slug,
  accounts.display_name,
  profiles.headline,
  profiles.about,
  profiles.location,
  profiles.timezone,
  profiles.base_price_credits,
  profiles.average_rating,
  profiles.completed_booking_count,
  profiles.published_at,
  applications.teaching_experience,
  applications.languages,
  images.object_key as profile_image_object_key,
  images.content_type as profile_image_content_type,
  coalesce(subjects.items, '[]'::jsonb) as subjects,
  coalesce(formats.items, '[]'::jsonb) as formats
from public.tutor_profiles profiles
join public.user_accounts accounts on accounts.id = profiles.tutor_user_id
join public.tutor_applications applications on applications.id = profiles.approved_application_id
join public.object_files images on images.id = profiles.profile_image_file_id
left join lateral (
  select jsonb_agg(jsonb_build_object('examination', examination, 'subject', subject, 'priceCredits', price_credits) order by examination, subject) as items
  from public.tutor_profile_subjects where tutor_profile_id = profiles.id
) subjects on true
left join lateral (
  select jsonb_agg(format order by format) as items
  from public.tutor_profile_formats where tutor_profile_id = profiles.id
) formats on true
where profiles.status = 'active'
  and applications.status = 'approved'
  and accounts.status = 'active' and accounts.deleted_at is null
  and images.scan_status = 'clean' and images.deleted_at is null;

revoke all on function public.save_tutor_application(uuid, uuid, jsonb) from public;
revoke all on function public.register_tutor_application_document(uuid, uuid, text, public.object_kind, text, text, text, bigint, text, text) from public;
revoke all on function public.transition_tutor_application(uuid, uuid, public.tutor_application_status, text, text) from public;
revoke all on function public.finalize_expired_object_deletion(uuid) from public;
revoke all on public.public_tutor_marketplace_profiles from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.save_tutor_application(uuid, uuid, jsonb) to service_role';
    execute 'grant execute on function public.register_tutor_application_document(uuid, uuid, text, public.object_kind, text, text, text, bigint, text, text) to service_role';
    execute 'grant execute on function public.transition_tutor_application(uuid, uuid, public.tutor_application_status, text, text) to service_role';
    execute 'grant execute on function public.finalize_expired_object_deletion(uuid) to service_role';
    execute 'grant select on public.public_tutor_marketplace_profiles to service_role';
  end if;
end;
$$;
