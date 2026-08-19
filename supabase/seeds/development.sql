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
