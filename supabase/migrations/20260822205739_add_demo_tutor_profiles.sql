alter table public.tutor_profiles
  add column profile_image_public_path text,
  add column is_demo boolean not null default false,
  add constraint tutor_profiles_public_image_path
    check (
      profile_image_public_path is null
      or profile_image_public_path ~ '^/images/tutors/[a-z0-9-]+[.]png$'
    );

create index tutor_profiles_demo_idx
on public.tutor_profiles (is_demo, published_at desc)
where status = 'active';

create or replace view public.public_tutor_marketplace_profiles
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
  coalesce(formats.items, '[]'::jsonb) as formats,
  profiles.is_demo,
  profiles.profile_image_public_path
from public.tutor_profiles profiles
join public.user_accounts accounts on accounts.id = profiles.tutor_user_id
join public.tutor_applications applications on applications.id = profiles.approved_application_id
left join public.object_files images on images.id = profiles.profile_image_file_id
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'examination', examination,
      'subject', subject,
      'priceCredits', price_credits
    ) order by examination, subject
  ) as items
  from public.tutor_profile_subjects
  where tutor_profile_id = profiles.id
) subjects on true
left join lateral (
  select jsonb_agg(format order by format) as items
  from public.tutor_profile_formats
  where tutor_profile_id = profiles.id
) formats on true
where profiles.status = 'active'
  and applications.status = 'approved'
  and accounts.status = 'active'
  and accounts.deleted_at is null
  and (
    profiles.profile_image_public_path is not null
    or (
      images.scan_status = 'clean'
      and images.deleted_at is null
    )
  );

create temporary table studacad_demo_tutor_seed (
  ordinal integer primary key,
  account_id uuid not null,
  auth_subject uuid not null,
  application_id uuid not null,
  profile_id uuid not null,
  display_name text not null,
  slug text not null,
  email text not null,
  headline text not null,
  biography text not null,
  location text not null,
  district text not null,
  price_credits integer not null,
  rating numeric(3,2) not null,
  lessons integer not null,
  teaching_experience text not null,
  languages text[] not null,
  image_path text not null,
  subjects jsonb not null,
  formats jsonb not null
) on commit drop;

insert into studacad_demo_tutor_seed values
  (1, 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 'Naledi Molefe', 'naledi-molefe-demo', 'demo-tutor-01@studacad.example', 'Patient BGCSE Mathematics support built around past-paper confidence.', 'This fictional demonstration profile shows how a Studacad tutor page will look. Naledi uses worked examples, short diagnostic questions, and clear revision plans to help BGCSE learners build confidence in Mathematics.', 'Gaborone', 'South-East', 120, 4.92, 184, 'Eight years supporting secondary Mathematics learners', array['English','Setswana'], '/images/tutors/naledi-molefe.png', '[{"examination":"BGCSE","subject":"Mathematics"},{"examination":"JCE","subject":"Mathematics"}]', '["online_1to1","online_group"]'),
  (2, 'd0000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000002', 'Kabelo Dube', 'kabelo-dube-demo', 'demo-tutor-02@studacad.example', 'BGCSE Physics explained through diagrams, calculations, and exam technique.', 'This fictional demonstration profile presents a Physics tutor who breaks difficult concepts into diagrams, practical examples, and structured calculations, with every lesson linked to BGCSE examination requirements.', 'Francistown', 'North-East', 130, 4.88, 146, 'Six years teaching Physics and General Science', array['English','Setswana'], '/images/tutors/kabelo-dube.png', '[{"examination":"BGCSE","subject":"Physics"},{"examination":"JCE","subject":"General Science"}]', '["online_1to1","tutor_place"]'),
  (3, 'd0000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000003', 'd3000000-0000-4000-8000-000000000003', 'Amantle Kgosi', 'amantle-kgosi-demo', 'demo-tutor-03@studacad.example', 'Friendly PSLE English lessons for reading, grammar, and writing confidence.', 'This fictional demonstration profile shows a supportive primary tutor. Amantle combines guided reading, vocabulary practice, and short writing tasks to help PSLE learners communicate clearly and prepare calmly.', 'Maun', 'North-West', 85, 4.95, 231, 'Nine years supporting upper-primary literacy', array['English','Setswana'], '/images/tutors/amantle-kgosi.png', '[{"examination":"PSLE","subject":"English"},{"examination":"PSLE","subject":"Social Studies"}]', '["online_1to1","student_place"]'),
  (4, 'd0000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000004', 'd3000000-0000-4000-8000-000000000004', 'Thabo Moyo', 'thabo-moyo-demo', 'demo-tutor-04@studacad.example', 'JCE General Science made practical, memorable, and examination focused.', 'This fictional demonstration profile represents a General Science tutor who connects classroom concepts to everyday Botswana examples, then reinforces each topic with diagrams, recall practice, and JCE questions.', 'Gaborone', 'South-East', 105, 4.83, 119, 'Seven years teaching junior secondary Science', array['English','Setswana'], '/images/tutors/thabo-moyo.png', '[{"examination":"JCE","subject":"General Science"},{"examination":"BGCSE","subject":"Biology"}]', '["online_1to1","online_group"]'),
  (5, 'd0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000005', 'd3000000-0000-4000-8000-000000000005', 'Lorato Sechele', 'lorato-sechele-demo', 'demo-tutor-05@studacad.example', 'Structured BGCSE Biology revision with clear diagrams and active recall.', 'This fictional demonstration profile shows a Biology tutor who uses labelled diagrams, retrieval questions, and syllabus checklists to turn large topics into manageable BGCSE revision sessions.', 'Molepolole', 'Kweneng', 115, 4.90, 167, 'Seven years teaching Biology and integrated Science', array['English','Setswana'], '/images/tutors/lorato-sechele.png', '[{"examination":"BGCSE","subject":"Biology"},{"examination":"JCE","subject":"General Science"}]', '["online_1to1","tutor_place"]'),
  (6, 'd0000000-0000-4000-8000-000000000006', 'd1000000-0000-4000-8000-000000000006', 'd2000000-0000-4000-8000-000000000006', 'd3000000-0000-4000-8000-000000000006', 'Boitumelo Rantao', 'boitumelo-rantao-demo', 'demo-tutor-06@studacad.example', 'Calm PSLE Mathematics coaching that strengthens every core skill.', 'This fictional demonstration profile presents a patient Mathematics tutor who checks foundational skills, models each method step by step, and gives focused practice for confident PSLE preparation.', 'Serowe', 'Central', 80, 4.97, 264, 'Ten years teaching upper-primary Mathematics', array['Setswana','English'], '/images/tutors/boitumelo-rantao.png', '[{"examination":"PSLE","subject":"Mathematics"},{"examination":"PSLE","subject":"Science"}]', '["online_1to1","student_place"]'),
  (7, 'd0000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-000000000007', 'd2000000-0000-4000-8000-000000000007', 'd3000000-0000-4000-8000-000000000007', 'Tumelo Ndlovu', 'tumelo-ndlovu-demo', 'demo-tutor-07@studacad.example', 'JCE English support for comprehension, language, and stronger essays.', 'This fictional demonstration profile shows an English tutor who teaches learners to analyse questions, plan responses, improve sentence control, and edit their own work against JCE expectations.', 'Kanye', 'Southern', 95, 4.86, 138, 'Six years teaching junior secondary English', array['English','Setswana'], '/images/tutors/tumelo-ndlovu.png', '[{"examination":"JCE","subject":"English"},{"examination":"PSLE","subject":"English"}]', '["online_1to1","online_group"]'),
  (8, 'd0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-000000000008', 'd2000000-0000-4000-8000-000000000008', 'd3000000-0000-4000-8000-000000000008', 'Keitumetse Modise', 'keitumetse-modise-demo', 'demo-tutor-08@studacad.example', 'BGCSE Accounting lessons that connect principles to accurate practice.', 'This fictional demonstration profile presents an Accounting tutor who builds understanding from double entry through final accounts, using careful worked examples and timed BGCSE practice.', 'Gaborone', 'South-East', 125, 4.91, 153, 'Eight years teaching Accounting and Business Studies', array['English','Setswana'], '/images/tutors/keitumetse-modise.png', '[{"examination":"BGCSE","subject":"Accounting"},{"examination":"BGCSE","subject":"Business Studies"}]', '["online_1to1","online_group"]'),
  (9, 'd0000000-0000-4000-8000-000000000009', 'd1000000-0000-4000-8000-000000000009', 'd2000000-0000-4000-8000-000000000009', 'd3000000-0000-4000-8000-000000000009', 'Tshepo Kgosidintsi', 'tshepo-kgosidintsi-demo', 'demo-tutor-09@studacad.example', 'BGCSE Chemistry taught with balanced equations and confident problem solving.', 'This fictional demonstration profile shows a Chemistry tutor who links concepts, equations, and calculations, then uses targeted past-paper questions to identify and close knowledge gaps.', 'Palapye', 'Central', 120, 4.87, 142, 'Seven years teaching Chemistry and Physical Science', array['English','Setswana'], '/images/tutors/tshepo-kgosidintsi.png', '[{"examination":"BGCSE","subject":"Chemistry"},{"examination":"BGCSE","subject":"Physics"}]', '["online_1to1","tutor_place"]'),
  (10, 'd0000000-0000-4000-8000-000000000010', 'd1000000-0000-4000-8000-000000000010', 'd2000000-0000-4000-8000-000000000010', 'd3000000-0000-4000-8000-000000000010', 'Onalenna Mokgosi', 'onalenna-mokgosi-demo', 'demo-tutor-10@studacad.example', 'Engaging PSLE Setswana lessons for language fluency and exam readiness.', 'This fictional demonstration profile presents a Setswana tutor who develops vocabulary, comprehension, grammar, and written expression through friendly lessons grounded in PSLE requirements.', 'Mochudi', 'Kgatleng', 85, 4.94, 205, 'Nine years supporting Setswana language learning', array['Setswana','English'], '/images/tutors/onalenna-mokgosi.png', '[{"examination":"PSLE","subject":"Setswana"},{"examination":"PSLE","subject":"English"}]', '["online_1to1","student_place"]');

insert into public.user_accounts (
  id, auth_subject, email, display_name, status, email_verified_at
)
select account_id, auth_subject, email, display_name, 'active', now()
from studacad_demo_tutor_seed
on conflict (id) do update
set display_name = excluded.display_name,
    status = 'active',
    email_verified_at = excluded.email_verified_at,
    deleted_at = null;

insert into public.user_roles (user_id, role)
select account_id, role::public.app_role
from studacad_demo_tutor_seed
cross join (values ('learner'), ('tutor')) roles(role)
on conflict (user_id, role) do update set revoked_at = null;

insert into public.tutor_applications (
  id, applicant_user_id, status, version, legal_name, biography, location,
  timezone, base_price_credits, consented_at, submitted_at, reviewed_at,
  district, headline, teaching_experience, languages,
  session_duration_minutes, availability
)
select
  application_id, account_id, 'approved', 1, display_name, biography, location,
  'Africa/Gaborone', price_credits, now(), now(), now(), district, headline,
  teaching_experience, languages, 60,
  '{"days":["Monday","Wednesday","Saturday"],"startTime":"15:00","endTime":"19:00"}'::jsonb
from studacad_demo_tutor_seed
on conflict (id) do update
set status = 'approved',
    headline = excluded.headline,
    biography = excluded.biography,
    location = excluded.location,
    base_price_credits = excluded.base_price_credits,
    teaching_experience = excluded.teaching_experience,
    languages = excluded.languages,
    reviewed_at = now();

insert into public.tutor_application_subjects (application_id, examination, subject)
select
  seed.application_id,
  (item ->> 'examination')::public.exam_level,
  item ->> 'subject'
from studacad_demo_tutor_seed seed
cross join lateral jsonb_array_elements(seed.subjects) item
on conflict do nothing;

insert into public.tutor_application_formats (application_id, format)
select seed.application_id, value::public.session_format
from studacad_demo_tutor_seed seed
cross join lateral jsonb_array_elements_text(seed.formats) value
on conflict do nothing;

insert into public.tutor_profiles (
  id, tutor_user_id, approved_application_id, status, slug, headline, about,
  location, timezone, base_price_credits, profile_image_public_path, is_demo,
  average_rating, completed_booking_count, published_at
)
select
  profile_id, account_id, application_id, 'active', slug, headline, biography,
  location, 'Africa/Gaborone', price_credits, image_path, true,
  rating, lessons, now() - (ordinal || ' minutes')::interval
from studacad_demo_tutor_seed
on conflict (id) do update
set status = 'active',
    headline = excluded.headline,
    about = excluded.about,
    location = excluded.location,
    base_price_credits = excluded.base_price_credits,
    profile_image_public_path = excluded.profile_image_public_path,
    is_demo = true,
    average_rating = excluded.average_rating,
    completed_booking_count = excluded.completed_booking_count,
    published_at = excluded.published_at;

insert into public.tutor_profile_subjects (
  tutor_profile_id, examination, subject, price_credits
)
select
  seed.profile_id,
  (item ->> 'examination')::public.exam_level,
  item ->> 'subject',
  seed.price_credits
from studacad_demo_tutor_seed seed
cross join lateral jsonb_array_elements(seed.subjects) item
on conflict do nothing;

insert into public.tutor_profile_formats (tutor_profile_id, format, group_capacity)
select
  seed.profile_id,
  value::public.session_format,
  case when value = 'online_group' then 6 else 1 end
from studacad_demo_tutor_seed seed
cross join lateral jsonb_array_elements_text(seed.formats) value
on conflict do nothing;

insert into public.availability_rules (
  tutor_profile_id, weekday, local_start_time, local_end_time, timezone,
  format, slot_duration_minutes, lead_time_minutes, effective_from
)
select
  seed.profile_id, schedule.weekday, schedule.starts_at, schedule.ends_at,
  'Africa/Gaborone', 'online_1to1', 50, 120, current_date
from studacad_demo_tutor_seed seed
cross join (
  values
    (1::smallint, '15:00'::time, '19:00'::time),
    (3::smallint, '15:00'::time, '19:00'::time),
    (6::smallint, '09:00'::time, '14:00'::time)
) schedule(weekday, starts_at, ends_at)
where not exists (
  select 1
  from public.availability_rules existing
  where existing.tutor_profile_id = seed.profile_id
    and existing.weekday = schedule.weekday
    and existing.local_start_time = schedule.starts_at
    and existing.local_end_time = schedule.ends_at
    and existing.format = 'online_1to1'
);

do $$
begin
  if (select count(*) from public.tutor_profiles where is_demo) <> 10 then
    raise exception 'Expected exactly 10 demo tutor profiles';
  end if;
end;
$$;
