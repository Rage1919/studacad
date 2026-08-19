import "server-only";
import { getDatabaseAdminClient } from "../db/client";
import type { CourseStatus, Json } from "../db/models";
import type { Course, LmsState, ReferralReward } from "../../app/lib/lms";

export class LearningError extends Error {
  constructor(message: string, readonly status = 400) { super(message); this.name = "LearningError"; }
}

const safeMessage = (error: { message?: string } | null, fallback: string) => {
  const message = error?.message ?? "";
  const known = [
    "Published course not found", "Insufficient credits", "Only an active learner may purchase a course",
    "Idempotency key was already used for a different course purchase", "Purchased lesson not found",
    "Every quiz question must be answered exactly once", "Quiz answer references an invalid question",
    "Quiz answer references an invalid option", "Self-referral is not allowed", "Referral code is invalid or unavailable",
    "This account already has a different referral attribution", "Only an active administrator may manage learning content",
    "Publish at least one lesson before publishing the course", "Course not found", "Lesson not found"
  ].find(candidate => message.includes(candidate));
  if (known) return new LearningError(known, known.endsWith("not found") ? 404 : known.startsWith("Only") || known.includes("Self-") ? 403 : 409);
  return new LearningError(fallback, 500);
};

export async function getLearningSnapshot(userId: string, includeDrafts = false): Promise<LmsState> {
  const database = getDatabaseAdminClient();
  let courseQuery = database.from("courses").select("*").order("created_at", { ascending: false });
  if (!includeDrafts) courseQuery = courseQuery.eq("status", "published");
  const coursesResult = await courseQuery;
  if (coursesResult.error) throw new LearningError("Unable to load courses.", 500);
  const courseIds = coursesResult.data.map(course => course.id);
  if (!courseIds.length) return { credits: 0, courses: [], purchasedCourseIds: [], completedLessonIds: [], quizScores: {}, transactions: [], referralRewards: [] };

  const purchasesResult = includeDrafts
    ? { data: [], error: null }
    : await database.from("course_purchases").select("*").eq("learner_user_id", userId).eq("status", "completed");
  if (purchasesResult.error) throw new LearningError("Unable to load the learning library.", 500);
  const ownedCourseIds = new Set(purchasesResult.data.map(purchase => purchase.course_id));

  let lessonQuery = database.from("lessons").select("*").in("course_id", courseIds).order("position");
  if (!includeDrafts) lessonQuery = lessonQuery.eq("status", "published");
  const lessonsResult = await lessonQuery;
  if (lessonsResult.error) throw new LearningError("Unable to load course lessons.", 500);
  const detailedLessonIds = lessonsResult.data.filter(lesson => includeDrafts || ownedCourseIds.has(lesson.course_id)).map(lesson => lesson.id);

  const [questionsResult, progressResult] = await Promise.all([
    detailedLessonIds.length
      ? database.from("quiz_questions").select("*").in("lesson_id", detailedLessonIds).order("position")
      : Promise.resolve({ data: [], error: null }),
    includeDrafts || !detailedLessonIds.length
      ? Promise.resolve({ data: [], error: null })
      : database.from("lesson_progress").select("*").eq("learner_user_id", userId).in("lesson_id", detailedLessonIds)
  ]);
  if (questionsResult.error || progressResult.error) throw new LearningError("Unable to load learning progress.", 500);
  const questionIds = questionsResult.data.map(question => question.id);
  const optionsResult = questionIds.length
    ? await database.from("quiz_options").select("*").in("question_id", questionIds).order("position")
    : { data: [], error: null };
  if (optionsResult.error) throw new LearningError("Unable to load lesson quizzes.", 500);

  const profiles = coursesResult.data.map(course => course.instructor_tutor_profile_id).filter((id): id is string => Boolean(id));
  const profileResult = profiles.length ? await database.from("tutor_profiles").select("*").in("id", profiles) : { data: [], error: null };
  const profileRows = profileResult.data ?? [];
  const tutorUserIds = profileRows.map(profile => profile.tutor_user_id);
  const accountResult = tutorUserIds.length ? await database.from("user_accounts").select("*").in("id", tutorUserIds) : { data: [], error: null };
  const accountRows = accountResult.data ?? [];
  const accountById = new Map(accountRows.map(account => [account.id, account.display_name]));
  const instructorByProfile = new Map(profileRows.map(profile => [profile.id, accountById.get(profile.tutor_user_id) ?? "Studacad tutor"]));
  const optionsByQuestion = new Map<string, typeof optionsResult.data>();
  for (const option of optionsResult.data) optionsByQuestion.set(option.question_id, [...(optionsByQuestion.get(option.question_id) ?? []), option]);
  const questionsByLesson = new Map<string, typeof questionsResult.data>();
  for (const question of questionsResult.data) questionsByLesson.set(question.lesson_id, [...(questionsByLesson.get(question.lesson_id) ?? []), question]);
  const lessonsByCourse = new Map<string, typeof lessonsResult.data>();
  for (const lesson of lessonsResult.data) lessonsByCourse.set(lesson.course_id, [...(lessonsByCourse.get(lesson.course_id) ?? []), lesson]);

  const courses: Course[] = coursesResult.data.map(course => ({
    id: course.slug,
    databaseId: course.id,
    title: course.title,
    examination: course.examination,
    subject: course.subject,
    description: course.description,
    color: course.theme_color,
    price: course.price_credits,
    instructor: course.instructor_tutor_profile_id ? instructorByProfile.get(course.instructor_tutor_profile_id) ?? "Studacad tutor" : "Studacad",
    status: course.status,
    lessons: (lessonsByCourse.get(course.id) ?? []).map(lesson => {
      const authorized = includeDrafts || ownedCourseIds.has(course.id);
      const questions = authorized ? questionsByLesson.get(lesson.id) ?? [] : [];
      return {
        id: lesson.slug,
        databaseId: lesson.id,
        title: lesson.title,
        duration: `${lesson.duration_minutes} min`,
        description: authorized ? lesson.description : "Purchase this course to open the lesson.",
        videoUrl: authorized ? lesson.video_url ?? "" : "",
        revisionTitle: authorized ? lesson.revision_title ?? "Revision material" : "",
        revisionContent: authorized ? lesson.revision_content ?? "" : "",
        status: lesson.status,
        quiz: questions.map(question => {
          const options = optionsByQuestion.get(question.id) ?? [];
          const correctIndex = includeDrafts ? options.findIndex(option => option.is_correct) : undefined;
          return {
            id: question.id,
            prompt: question.prompt,
            options: options.map(option => option.label),
            optionIds: options.map(option => option.id),
            ...(includeDrafts ? { correctIndex } : {})
          };
        })
      };
    })
  }));

  const progress = progressResult.data;
  return {
    credits: 0,
    courses,
    purchasedCourseIds: coursesResult.data.filter(course => ownedCourseIds.has(course.id)).map(course => course.slug),
    completedLessonIds: progress.filter(item => item.status === "completed").flatMap(item => {
      const lesson = lessonsResult.data.find(candidate => candidate.id === item.lesson_id);
      return lesson ? [lesson.slug] : [];
    }),
    quizScores: Object.fromEntries(progress.flatMap(item => {
      const lesson = lessonsResult.data.find(candidate => candidate.id === item.lesson_id);
      return lesson && item.best_score_percent !== null ? [[lesson.slug, Math.round(Number(item.best_score_percent))]] : [];
    })),
    transactions: [],
    referralRewards: []
  };
}

export async function purchaseCourse(userId: string, courseSlug: string, idempotencyKey: string) {
  const { data, error } = await getDatabaseAdminClient().rpc("purchase_course", {
    p_learner_user_id: userId, p_course_slug: courseSlug, p_idempotency_key: idempotencyKey
  });
  if (error) throw safeMessage(error, "Unable to purchase the course.");
  return data;
}

export async function submitQuizAttempt(userId: string, lessonId: string, answers: Json, idempotencyKey: string) {
  const { data, error } = await getDatabaseAdminClient().rpc("submit_quiz_attempt", {
    p_learner_user_id: userId, p_lesson_id: lessonId, p_answers: answers, p_idempotency_key: idempotencyKey
  });
  if (error) throw safeMessage(error, "Unable to submit the quiz.");
  return data;
}

export async function listTutorFavourites(userId: string): Promise<string[]> {
  const { data, error } = await getDatabaseAdminClient().from("tutor_favourites").select("*").eq("learner_user_id", userId);
  if (error) throw new LearningError("Unable to load tutor favourites.", 500);
  return data.map(item => item.tutor_profile_id);
}

export async function setTutorFavourite(userId: string, tutorProfileId: string, favourite: boolean) {
  const database = getDatabaseAdminClient();
  const profile = await database.from("tutor_profiles").select("*").eq("id", tutorProfileId).eq("status", "active").maybeSingle();
  if (profile.error || !profile.data) throw new LearningError("Published tutor not found.", 404);
  const result = favourite
    ? await database.from("tutor_favourites").upsert({ learner_user_id: userId, tutor_profile_id: tutorProfileId, created_at: new Date().toISOString() })
    : await database.from("tutor_favourites").delete().eq("learner_user_id", userId).eq("tutor_profile_id", tutorProfileId);
  if (result.error) throw new LearningError("Unable to update tutor favourites.", 500);
}

export async function getReferralStatus(userId: string): Promise<{ code: string; rewards: ReferralReward[] }> {
  const database = getDatabaseAdminClient();
  const codeResult = await database.rpc("get_or_create_referral_code", { p_owner_user_id: userId });
  if (codeResult.error) throw safeMessage(codeResult.error, "Unable to load the referral code.");
  const codeRow = await database.from("referral_codes").select("*").eq("owner_user_id", userId).single();
  if (codeRow.error) throw new LearningError("Unable to load referral activity.", 500);
  const attributions = await database.from("referral_attributions").select("*").eq("referral_code_id", codeRow.data.id);
  if (attributions.error) throw new LearningError("Unable to load referral activity.", 500);
  const attributionIds = attributions.data.map(item => item.id);
  const rewards = attributionIds.length
    ? await database.from("referral_rewards").select("*").in("attribution_id", attributionIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (rewards.error) throw new LearningError("Unable to load referral rewards.", 500);
  return {
    code: codeResult.data,
    rewards: rewards.data.map(reward => ({
      id: reward.id, amount: reward.credits, status: reward.status, qualifyingBookingId: reward.qualifying_booking_id,
      createdAt: reward.created_at, earnedAt: reward.earned_at
    }))
  };
}

export async function attachReferralCode(userId: string, code: string) {
  const { data, error } = await getDatabaseAdminClient().rpc("attach_referral_code", { p_referred_user_id: userId, p_code: code });
  if (error) throw safeMessage(error, "Unable to attach the referral code.");
  return data;
}

export async function executeContentCommand(actorUserId: string, action: string, payload: Record<string, unknown>) {
  const database = getDatabaseAdminClient();
  if (action === "createCourse") {
    const result = await database.rpc("admin_create_course", { p_actor_user_id: actorUserId, p_payload: payload as Json });
    if (result.error) throw safeMessage(result.error, "Unable to create the course.");
    return { id: result.data };
  }
  if (action === "createLesson") {
    const result = await database.rpc("admin_create_lesson", { p_actor_user_id: actorUserId, p_payload: payload as Json });
    if (result.error) throw safeMessage(result.error, "Unable to create the lesson.");
    return { id: result.data };
  }
  const status = payload.status as CourseStatus;
  if (action === "setCourseStatus") {
    const result = await database.rpc("admin_set_course_status", { p_actor_user_id: actorUserId, p_course_id: String(payload.id), p_status: status });
    if (result.error) throw safeMessage(result.error, "Unable to update the course.");
    return { status: result.data };
  }
  if (action === "setLessonStatus") {
    const result = await database.rpc("admin_set_lesson_status", { p_actor_user_id: actorUserId, p_lesson_id: String(payload.id), p_status: status });
    if (result.error) throw safeMessage(result.error, "Unable to update the lesson.");
    return { status: result.data };
  }
  throw new LearningError("Unsupported content action.");
}

export function learningErrorResponse(error: unknown): Response {
  if (error instanceof LearningError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  throw error;
}
