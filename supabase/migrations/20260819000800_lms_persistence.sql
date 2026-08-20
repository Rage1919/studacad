alter table public.courses
  add column theme_color text not null default '#dbeafe'
  check (theme_color ~ '^#[0-9a-fA-F]{6}$');

alter table public.lessons
  add column revision_title text;

create unique index referral_rewards_one_per_attribution
  on public.referral_rewards (attribution_id);

create function public.purchase_course(
  p_learner_user_id uuid,
  p_course_slug text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_course public.courses%rowtype;
  v_purchase public.course_purchases%rowtype;
  v_learner_wallet uuid;
  v_sales_wallet uuid;
  v_balance bigint;
  v_transaction_id uuid;
begin
  if length(trim(p_idempotency_key)) < 12 then
    raise exception 'A stable purchase idempotency key is required';
  end if;

  if not exists (
    select 1 from public.user_accounts account
    join public.user_roles role on role.user_id = account.id
    where account.id = p_learner_user_id and account.status = 'active'
      and role.role = 'learner' and role.revoked_at is null
  ) then
    raise exception 'Only an active learner may purchase a course';
  end if;

  select * into v_course from public.courses
  where slug = trim(p_course_slug) and status = 'published'
  for share;
  if not found then raise exception 'Published course not found'; end if;

  select * into v_purchase from public.course_purchases
  where idempotency_key = trim(p_idempotency_key);
  if found then
    if v_purchase.learner_user_id <> p_learner_user_id or v_purchase.course_id <> v_course.id then
      raise exception 'Idempotency key was already used for a different course purchase';
    end if;
    return jsonb_build_object('purchaseId', v_purchase.id, 'courseSlug', v_course.slug, 'replayed', true);
  end if;

  select * into v_purchase from public.course_purchases
  where learner_user_id = p_learner_user_id and course_id = v_course.id;
  if found and v_purchase.status = 'completed' then
    return jsonb_build_object('purchaseId', v_purchase.id, 'courseSlug', v_course.slug, 'replayed', true);
  end if;

  insert into public.wallet_accounts (owner_user_id) values (p_learner_user_id)
  on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id
  returning id into v_learner_wallet;
  perform 1 from public.wallet_accounts where id = v_learner_wallet for update;
  select coalesce(sum(amount_credits), 0) into v_balance
  from public.ledger_entries where wallet_account_id = v_learner_wallet;
  if v_balance < v_course.price_credits then raise exception 'Insufficient credits'; end if;

  insert into public.course_purchases (
    learner_user_id, course_id, status, price_credits, idempotency_key, purchased_at
  ) values (
    p_learner_user_id, v_course.id, 'completed', v_course.price_credits,
    trim(p_idempotency_key), now()
  ) returning * into v_purchase;

  if v_course.price_credits > 0 then
    insert into public.wallet_accounts (system_code) values ('course_sales')
    on conflict (system_code) do update set system_code = excluded.system_code
    returning id into v_sales_wallet;
    insert into public.ledger_transactions (
      kind, idempotency_key, description, course_purchase_id, actor_user_id, metadata
    ) values (
      'purchase', 'course-purchase:' || v_purchase.id, 'Course purchase: ' || v_course.title,
      v_purchase.id, p_learner_user_id, jsonb_build_object('courseSlug', v_course.slug)
    ) returning id into v_transaction_id;
    insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits)
    values
      (v_transaction_id, v_learner_wallet, -v_course.price_credits),
      (v_transaction_id, v_sales_wallet, v_course.price_credits);
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, after_state)
  values (p_learner_user_id, 'course.purchased', 'course_purchase', v_purchase.id,
    jsonb_build_object('courseId', v_course.id, 'priceCredits', v_course.price_credits));
  return jsonb_build_object('purchaseId', v_purchase.id, 'courseSlug', v_course.slug, 'replayed', false);
end;
$$;

create function public.submit_quiz_attempt(
  p_learner_user_id uuid,
  p_lesson_id uuid,
  p_answers jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.quiz_attempts%rowtype;
  v_question_count integer;
  v_possible integer;
  v_score integer := 0;
  v_percent numeric(5,2);
  v_passed boolean;
  v_answer jsonb;
  v_question public.quiz_questions%rowtype;
  v_option public.quiz_options%rowtype;
begin
  if length(trim(p_idempotency_key)) < 12 then raise exception 'A stable quiz idempotency key is required'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'Quiz answers must be an array'; end if;

  select * into v_attempt from public.quiz_attempts where idempotency_key = trim(p_idempotency_key);
  if found then
    if v_attempt.learner_user_id <> p_learner_user_id or v_attempt.lesson_id <> p_lesson_id then
      raise exception 'Idempotency key was already used for a different quiz attempt';
    end if;
    return jsonb_build_object(
      'attemptId', v_attempt.id, 'scorePercent', round(v_attempt.score_points * 100.0 / v_attempt.possible_points),
      'passed', v_attempt.passed, 'replayed', true
    );
  end if;

  if not exists (
    select 1 from public.lessons lesson
    join public.courses course on course.id = lesson.course_id
    join public.course_purchases purchase on purchase.course_id = course.id
    where lesson.id = p_lesson_id and lesson.status = 'published' and course.status = 'published'
      and purchase.learner_user_id = p_learner_user_id and purchase.status = 'completed'
  ) then raise exception 'Purchased lesson not found'; end if;

  select count(*), coalesce(sum(points), 0) into v_question_count, v_possible
  from public.quiz_questions where lesson_id = p_lesson_id;
  if v_question_count = 0 or jsonb_array_length(p_answers) <> v_question_count then
    raise exception 'Every quiz question must be answered exactly once';
  end if;
  if (select count(distinct answer->>'questionId') from jsonb_array_elements(p_answers) answer) <> v_question_count then
    raise exception 'Every quiz question must be answered exactly once';
  end if;

  for v_answer in select value from jsonb_array_elements(p_answers) loop
    select * into v_question from public.quiz_questions
    where id = (v_answer->>'questionId')::uuid and lesson_id = p_lesson_id;
    if not found then raise exception 'Quiz answer references an invalid question'; end if;
    select * into v_option from public.quiz_options
    where id = (v_answer->>'optionId')::uuid and question_id = v_question.id;
    if not found then raise exception 'Quiz answer references an invalid option'; end if;
    if v_option.is_correct then v_score := v_score + v_question.points; end if;
  end loop;

  v_percent := round(v_score * 100.0 / v_possible, 2);
  v_passed := v_percent >= 70;
  insert into public.quiz_attempts (
    learner_user_id, lesson_id, score_points, possible_points, passed, idempotency_key
  ) values (p_learner_user_id, p_lesson_id, v_score, v_possible, v_passed, trim(p_idempotency_key))
  returning * into v_attempt;

  for v_answer in select value from jsonb_array_elements(p_answers) loop
    select * into v_question from public.quiz_questions where id = (v_answer->>'questionId')::uuid;
    select * into v_option from public.quiz_options where id = (v_answer->>'optionId')::uuid;
    insert into public.quiz_attempt_answers (attempt_id, question_id, selected_option_id, awarded_points)
    values (v_attempt.id, v_question.id, v_option.id, case when v_option.is_correct then v_question.points else 0 end);
  end loop;

  insert into public.lesson_progress (
    learner_user_id, lesson_id, status, best_score_percent, started_at, completed_at, updated_at
  ) values (
    p_learner_user_id, p_lesson_id, case when v_passed then 'completed'::public.progress_status else 'in_progress'::public.progress_status end,
    v_percent, now(), case when v_passed then now() else null end, now()
  ) on conflict (learner_user_id, lesson_id) do update set
    status = case when public.lesson_progress.status = 'completed' or excluded.status = 'completed' then 'completed'::public.progress_status else 'in_progress'::public.progress_status end,
    best_score_percent = greatest(coalesce(public.lesson_progress.best_score_percent, 0), excluded.best_score_percent),
    started_at = coalesce(public.lesson_progress.started_at, excluded.started_at),
    completed_at = coalesce(public.lesson_progress.completed_at, excluded.completed_at),
    updated_at = now();
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, after_state)
  values (p_learner_user_id, 'quiz.attempt_submitted', 'quiz_attempt', v_attempt.id,
    jsonb_build_object('lessonId', p_lesson_id, 'scorePercent', v_percent, 'passed', v_passed));
  return jsonb_build_object('attemptId', v_attempt.id, 'scorePercent', round(v_percent), 'passed', v_passed, 'replayed', false);
end;
$$;

create function public.get_or_create_referral_code(p_owner_user_id uuid) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_code text;
begin
  if not exists (select 1 from public.user_accounts where id = p_owner_user_id and status = 'active') then
    raise exception 'Only an active account may use referrals';
  end if;
  select code into v_code from public.referral_codes where owner_user_id = p_owner_user_id and disabled_at is null;
  if found then return v_code; end if;
  v_code := 'STUD-' || upper(substr(replace(p_owner_user_id::text, '-', ''), 1, 12));
  insert into public.referral_codes (owner_user_id, code) values (p_owner_user_id, v_code)
  on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id
  returning code into v_code;
  return v_code;
end;
$$;

create function public.attach_referral_code(p_referred_user_id uuid, p_code text) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_referral public.referral_codes%rowtype; v_attribution public.referral_attributions%rowtype;
begin
  select * into v_referral from public.referral_codes where code = upper(trim(p_code)) and disabled_at is null;
  if not found then raise exception 'Referral code is invalid or unavailable'; end if;
  if v_referral.owner_user_id = p_referred_user_id then raise exception 'Self-referral is not allowed'; end if;
  select * into v_attribution from public.referral_attributions where referred_user_id = p_referred_user_id;
  if found then
    if v_attribution.referral_code_id <> v_referral.id then raise exception 'This account already has a different referral attribution'; end if;
    return v_attribution.id;
  end if;
  insert into public.referral_attributions (referral_code_id, referred_user_id)
  values (v_referral.id, p_referred_user_id) returning * into v_attribution;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, after_state)
  values (p_referred_user_id, 'referral.attributed', 'referral_attribution', v_attribution.id,
    jsonb_build_object('referralCodeId', v_referral.id));
  return v_attribution.id;
end;
$$;

create function public.award_completed_booking_referral() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_participant public.booking_participants%rowtype;
  v_attribution public.referral_attributions%rowtype;
  v_owner_user_id uuid;
  v_reward_id uuid;
  v_owner_wallet uuid;
  v_system_wallet uuid;
  v_transaction_id uuid;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;
  for v_participant in select * from public.booking_participants where booking_id = new.id and cancelled_at is null loop
    if exists (
      select 1 from public.booking_participants prior_participant
      join public.bookings prior_booking on prior_booking.id = prior_participant.booking_id
      where prior_participant.learner_user_id = v_participant.learner_user_id
        and prior_participant.cancelled_at is null and prior_booking.status = 'completed' and prior_booking.id <> new.id
    ) then continue; end if;
    select attribution.* into v_attribution
    from public.referral_attributions attribution
    where attribution.referred_user_id = v_participant.learner_user_id;
    if not found or exists (select 1 from public.referral_rewards where attribution_id = v_attribution.id) then continue; end if;
    select owner_user_id into v_owner_user_id from public.referral_codes where id = v_attribution.referral_code_id and disabled_at is null;
    if v_owner_user_id is null then continue; end if;

    insert into public.referral_rewards (attribution_id, qualifying_booking_id, credits, status, earned_at)
    values (v_attribution.id, new.id, 50, 'earned', now()) returning id into v_reward_id;
    insert into public.wallet_accounts (owner_user_id) values (v_owner_user_id)
    on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id returning id into v_owner_wallet;
    insert into public.wallet_accounts (system_code) values ('referral_rewards')
    on conflict (system_code) do update set system_code = excluded.system_code returning id into v_system_wallet;
    insert into public.ledger_transactions (kind, idempotency_key, description, actor_user_id, metadata)
    values ('reward', 'referral-reward:' || v_attribution.id, 'Referral reward', null,
      jsonb_build_object('referralRewardId', v_reward_id, 'qualifyingBookingId', new.id))
    returning id into v_transaction_id;
    insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits)
    values (v_transaction_id, v_system_wallet, -50), (v_transaction_id, v_owner_wallet, 50);
    update public.referral_rewards set ledger_transaction_id = v_transaction_id where id = v_reward_id;
    insert into public.audit_events (action, entity_type, entity_id, after_state)
    values ('referral.reward_earned', 'referral_reward', v_reward_id,
      jsonb_build_object('ownerUserId', v_owner_user_id, 'credits', 50, 'qualifyingBookingId', new.id));
  end loop;
  return new;
end;
$$;

create trigger bookings_award_completed_referral
after update of status on public.bookings
for each row execute function public.award_completed_booking_referral();

create function public.admin_create_course(p_actor_user_id uuid, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.user_accounts account join public.user_roles role on role.user_id = account.id where account.id = p_actor_user_id and account.status = 'active' and role.role = 'admin' and role.revoked_at is null) then raise exception 'Only an active administrator may manage learning content'; end if;
  insert into public.courses (slug, title, examination, subject, description, price_credits, theme_color, created_by_user_id)
  values (p_payload->>'slug', trim(p_payload->>'title'), (p_payload->>'examination')::public.exam_level,
    trim(p_payload->>'subject'), trim(p_payload->>'description'), (p_payload->>'priceCredits')::integer,
    coalesce(nullif(p_payload->>'themeColor', ''), '#dbeafe'), p_actor_user_id)
  returning id into v_id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, after_state)
  values (p_actor_user_id, 'course.created', 'course', v_id, p_payload);
  return v_id;
end; $$;

create function public.admin_create_lesson(p_actor_user_id uuid, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_question_id uuid; v_question jsonb; v_option jsonb; v_question_position integer := 0; v_option_position integer;
begin
  if not exists (select 1 from public.user_accounts account join public.user_roles role on role.user_id = account.id where account.id = p_actor_user_id and account.status = 'active' and role.role = 'admin' and role.revoked_at is null) then raise exception 'Only an active administrator may manage learning content'; end if;
  if jsonb_typeof(p_payload->'questions') <> 'array' or jsonb_array_length(p_payload->'questions') = 0 then raise exception 'A lesson requires at least one quiz question'; end if;
  insert into public.lessons (course_id, slug, title, description, duration_minutes, position, video_url, revision_title, revision_content)
  values ((p_payload->>'courseId')::uuid, p_payload->>'slug', trim(p_payload->>'title'), trim(p_payload->>'description'),
    (p_payload->>'durationMinutes')::integer,
    coalesce((select max(position) + 1 from public.lessons where course_id = (p_payload->>'courseId')::uuid), 0),
    nullif(trim(p_payload->>'videoUrl'), ''), trim(p_payload->>'revisionTitle'), trim(p_payload->>'revisionContent'))
  returning id into v_id;
  for v_question in select value from jsonb_array_elements(p_payload->'questions') loop
    if jsonb_typeof(v_question->'options') <> 'array' or jsonb_array_length(v_question->'options') < 2 then raise exception 'Each quiz question requires at least two options'; end if;
    insert into public.quiz_questions (lesson_id, prompt, position) values (v_id, trim(v_question->>'prompt'), v_question_position) returning id into v_question_id;
    v_option_position := 0;
    for v_option in select value from jsonb_array_elements(v_question->'options') loop
      insert into public.quiz_options (question_id, label, position, is_correct)
      values (v_question_id, trim(v_option#>>'{}'), v_option_position, v_option_position = (v_question->>'correctIndex')::integer);
      v_option_position := v_option_position + 1;
    end loop;
    if (v_question->>'correctIndex')::integer < 0 or (v_question->>'correctIndex')::integer >= v_option_position then raise exception 'Each quiz question requires one valid correct answer'; end if;
    v_question_position := v_question_position + 1;
  end loop;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, after_state)
  values (p_actor_user_id, 'lesson.created', 'lesson', v_id, p_payload - 'questions');
  return v_id;
end; $$;

create function public.admin_set_course_status(p_actor_user_id uuid, p_course_id uuid, p_status public.course_status) returns public.course_status
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_before public.course_status;
begin
  if not exists (select 1 from public.user_accounts account join public.user_roles role on role.user_id = account.id where account.id = p_actor_user_id and account.status = 'active' and role.role = 'admin' and role.revoked_at is null) then raise exception 'Only an active administrator may manage learning content'; end if;
  select status into v_before from public.courses where id = p_course_id for update;
  if not found then raise exception 'Course not found'; end if;
  if p_status = 'published' and not exists (select 1 from public.lessons where course_id = p_course_id and status = 'published') then raise exception 'Publish at least one lesson before publishing the course'; end if;
  update public.courses set status = p_status, published_at = case when p_status = 'published' then coalesce(published_at, now()) else published_at end where id = p_course_id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, before_state, after_state)
  values (p_actor_user_id, 'course.status_changed', 'course', p_course_id, jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
  return p_status;
end; $$;

create function public.admin_set_lesson_status(p_actor_user_id uuid, p_lesson_id uuid, p_status public.course_status) returns public.course_status
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_before public.course_status;
begin
  if not exists (select 1 from public.user_accounts account join public.user_roles role on role.user_id = account.id where account.id = p_actor_user_id and account.status = 'active' and role.role = 'admin' and role.revoked_at is null) then raise exception 'Only an active administrator may manage learning content'; end if;
  select status into v_before from public.lessons where id = p_lesson_id for update;
  if not found then raise exception 'Lesson not found'; end if;
  update public.lessons set status = p_status where id = p_lesson_id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, before_state, after_state)
  values (p_actor_user_id, 'lesson.status_changed', 'lesson', p_lesson_id, jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
  return p_status;
end; $$;

revoke all on function public.purchase_course(uuid, text, text) from public;
revoke all on function public.submit_quiz_attempt(uuid, uuid, jsonb, text) from public;
revoke all on function public.get_or_create_referral_code(uuid) from public;
revoke all on function public.attach_referral_code(uuid, text) from public;
revoke all on function public.admin_create_course(uuid, jsonb) from public;
revoke all on function public.admin_create_lesson(uuid, jsonb) from public;
revoke all on function public.admin_set_course_status(uuid, uuid, public.course_status) from public;
revoke all on function public.admin_set_lesson_status(uuid, uuid, public.course_status) from public;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.purchase_course(uuid, text, text) to service_role;
    grant execute on function public.submit_quiz_attempt(uuid, uuid, jsonb, text) to service_role;
    grant execute on function public.get_or_create_referral_code(uuid) to service_role;
    grant execute on function public.attach_referral_code(uuid, text) to service_role;
    grant execute on function public.admin_create_course(uuid, jsonb) to service_role;
    grant execute on function public.admin_create_lesson(uuid, jsonb) to service_role;
    grant execute on function public.admin_set_course_status(uuid, uuid, public.course_status) to service_role;
    grant execute on function public.admin_set_lesson_status(uuid, uuid, public.course_status) to service_role;
  end if;
end $$;
