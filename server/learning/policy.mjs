const clean = value => typeof value === "string" ? value.trim() : "";
const slugify = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotencyPattern = /^[A-Za-z0-9._:-]{12,160}$/;
const referralPattern = /^[A-Z0-9-]{6,32}$/;
const colors = /^#[0-9a-f]{6}$/i;

export const normalizeCoursePurchase = input => {
  const value = { courseSlug: slugify(input?.courseSlug), idempotencyKey: clean(input?.idempotencyKey) };
  const errors = [];
  if (!value.courseSlug) errors.push("A valid course is required.");
  if (!idempotencyPattern.test(value.idempotencyKey)) errors.push("A stable purchase idempotency key is required.");
  return { value, errors };
};

export const normalizeQuizAttempt = input => {
  const answers = Array.isArray(input?.answers) ? input.answers.map(answer => ({ questionId: clean(answer?.questionId), optionId: clean(answer?.optionId) })) : [];
  const value = { lessonId: clean(input?.lessonId), answers, idempotencyKey: clean(input?.idempotencyKey) };
  const errors = [];
  if (!uuidPattern.test(value.lessonId)) errors.push("A valid lesson is required.");
  if (!answers.length || answers.length > 100 || answers.some(answer => !uuidPattern.test(answer.questionId) || !uuidPattern.test(answer.optionId))) errors.push("Every quiz answer must be valid.");
  if (new Set(answers.map(answer => answer.questionId)).size !== answers.length) errors.push("Each quiz question may be answered once.");
  if (!idempotencyPattern.test(value.idempotencyKey)) errors.push("A stable quiz idempotency key is required.");
  return { value, errors };
};

export const normalizeReferralCode = value => {
  const code = clean(value).toUpperCase();
  return { code, valid: referralPattern.test(code) };
};

export const normalizeFavourite = input => {
  const tutorProfileId = clean(input?.tutorProfileId);
  return { tutorProfileId, valid: uuidPattern.test(tutorProfileId) };
};

export const normalizeContentCommand = input => {
  const action = clean(input?.action);
  if (action === "createCourse") {
    const payload = {
      slug: slugify(input?.course?.slug || input?.course?.title), title: clean(input?.course?.title),
      examination: clean(input?.course?.examination).toUpperCase(), subject: clean(input?.course?.subject),
      description: clean(input?.course?.description), priceCredits: Number(input?.course?.priceCredits),
      themeColor: clean(input?.course?.themeColor).toLowerCase() || "#dbeafe"
    };
    const valid = payload.slug.length >= 3 && payload.title.length >= 3 && ["PSLE", "JCE", "BGCSE"].includes(payload.examination)
      && payload.subject.length >= 2 && payload.description.length >= 20 && Number.isSafeInteger(payload.priceCredits)
      && payload.priceCredits >= 0 && colors.test(payload.themeColor);
    return { action, payload, errors: valid ? [] : ["Complete every course field with valid values."] };
  }
  if (action === "createLesson") {
    const questions = Array.isArray(input?.lesson?.questions) ? input.lesson.questions.map(question => ({
      prompt: clean(question?.prompt), options: Array.isArray(question?.options) ? question.options.map(clean) : [], correctIndex: Number(question?.correctIndex)
    })) : [];
    const duration = clean(input?.lesson?.duration);
    const durationMinutes = Number.parseInt(duration, 10);
    const payload = {
      courseId: clean(input?.lesson?.courseId), slug: slugify(input?.lesson?.slug || input?.lesson?.title),
      title: clean(input?.lesson?.title), description: clean(input?.lesson?.description),
      durationMinutes, videoUrl: clean(input?.lesson?.videoUrl), revisionTitle: clean(input?.lesson?.revisionTitle),
      revisionContent: clean(input?.lesson?.revisionContent), questions
    };
    const validQuestions = questions.length > 0 && questions.length <= 50 && questions.every(question => question.prompt.length >= 3
      && question.options.length >= 2 && question.options.length <= 8 && question.options.every(option => option.length > 0)
      && Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < question.options.length);
    const valid = uuidPattern.test(payload.courseId) && payload.slug.length >= 3 && payload.title.length >= 3
      && payload.description.length >= 10 && Number.isInteger(durationMinutes) && durationMinutes > 0 && durationMinutes <= 600
      && payload.revisionTitle.length >= 3 && payload.revisionContent.length >= 3 && validQuestions;
    return { action, payload, errors: valid ? [] : ["Complete the lesson and every quiz answer with valid values."] };
  }
  if (action === "setCourseStatus" || action === "setLessonStatus") {
    const payload = { id: clean(input?.id), status: clean(input?.status) };
    const valid = uuidPattern.test(payload.id) && ["draft", "published", "archived"].includes(payload.status);
    return { action, payload, errors: valid ? [] : ["A valid content item and status are required."] };
  }
  return { action, payload: {}, errors: ["Unsupported content action."] };
};
