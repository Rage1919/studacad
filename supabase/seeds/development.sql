insert into public.user_accounts (
  auth_subject,
  email,
  display_name,
  status,
  email_verified_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  'learner@example.test',
  'Development Learner',
  'active',
  now()
)
on conflict (auth_subject) do nothing;

insert into public.user_roles (user_id, role)
select id, 'learner'
from public.user_accounts
where auth_subject = '00000000-0000-4000-8000-000000000001'
on conflict (user_id, role) do nothing;

insert into public.user_accounts (
  id, auth_subject, email, display_name, status, email_verified_at
) values (
  '10000000-0000-4000-8000-000000000099',
  '00000000-0000-4000-8000-000000000099',
  'admin@example.test',
  'Development Content Admin',
  'active',
  now()
) on conflict (auth_subject) do nothing;

insert into public.user_roles (user_id, role)
values ('10000000-0000-4000-8000-000000000099', 'admin')
on conflict (user_id, role) do nothing;

-- Reviewed development-only LMS content. This seed creates no wallet funds,
-- purchases, progress, quiz attempts, referrals, or rewards.
insert into public.courses (
  id, slug, title, examination, subject, description, price_credits,
  theme_color, status, published_at, created_by_user_id
) values (
  '50000000-0000-4000-8000-000000000001',
  'psle-mathematics-readiness',
  'PSLE Mathematics Exam Readiness',
  'PSLE',
  'Mathematics',
  'Build confidence with Botswana PSLE number skills, worked examples, and checkpoint questions.',
  140,
  '#dbeafe',
  'published',
  now(),
  '10000000-0000-4000-8000-000000000099'
) on conflict (id) do nothing;

insert into public.lessons (
  id, course_id, slug, title, description, duration_minutes, position,
  video_url, revision_title, revision_content, status
) values (
  '60000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  'fractions-decimals-percentages',
  'Fractions, decimals and percentages',
  'Convert between fractions, decimals, and percentages in PSLE-style situations.',
  18,
  0,
  'https://www.youtube.com/embed/PSqbQXy8oq0',
  'PSLE number skills revision',
  E'1. Simplify 18/24.\n2. Write 0.45 as a percentage.\n3. Find 25% of P240.',
  'published'
) on conflict (id) do nothing;

insert into public.quiz_questions (id, lesson_id, prompt, position, points)
values
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'What is 3/4 written as a percentage?', 0, 1),
  ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'What is 20% of 150?', 1, 1)
on conflict (id) do nothing;

insert into public.quiz_options (id, question_id, label, position, is_correct)
values
  ('80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '34%', 0, false),
  ('80000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', '43%', 1, false),
  ('80000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000001', '75%', 2, true),
  ('80000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000001', '80%', 3, false),
  ('80000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000002', '20', 0, false),
  ('80000000-0000-4000-8000-000000000006', '70000000-0000-4000-8000-000000000002', '30', 1, true),
  ('80000000-0000-4000-8000-000000000007', '70000000-0000-4000-8000-000000000002', '50', 2, false),
  ('80000000-0000-4000-8000-000000000008', '70000000-0000-4000-8000-000000000002', '75', 3, false)
on conflict (id) do nothing;
