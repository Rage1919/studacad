export const SESSION_FORMATS = ["online_1to1", "online_group", "tutor_place", "student_place"];
export const EXAM_LEVELS = ["PSLE", "JCE", "BGCSE"];

export function normalizeSessionFormat(value) {
  const normalized = typeof value === "string" ? value.trim().replaceAll("-", "_") : "";
  return SESSION_FORMATS.includes(normalized) ? normalized : null;
}

export function validTimezone(value) {
  if (typeof value !== "string" || value.length > 100) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}

export function normalizeSlotQuery(input) {
  const format = normalizeSessionFormat(input?.format);
  const examination = typeof input?.examination === "string" && EXAM_LEVELS.includes(input.examination) ? input.examination : null;
  const subject = typeof input?.subject === "string" ? input.subject.trim() : "";
  const from = new Date(typeof input?.from === "string" ? input.from : "");
  const to = new Date(typeof input?.to === "string" ? input.to : "");
  const errors = [];
  if (!format) errors.push("Choose a supported session format.");
  if (!examination) errors.push("Choose PSLE, JCE, or BGCSE.");
  if (subject.length < 2 || subject.length > 100) errors.push("Choose a valid subject.");
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) errors.push("Choose a valid availability window.");
  else if (to.getTime() - from.getTime() > 31 * 86_400_000) errors.push("Availability can be requested for at most 31 days.");
  return { value: { format, examination, subject, from, to }, errors };
}

export function normalizeBookingRequest(input) {
  const format = normalizeSessionFormat(input?.format);
  const examination = typeof input?.examination === "string" && EXAM_LEVELS.includes(input.examination) ? input.examination : null;
  const tutorSlug = typeof input?.tutorSlug === "string" ? input.tutorSlug.trim() : "";
  const subject = typeof input?.subject === "string" ? input.subject.trim() : "";
  const startsAt = new Date(typeof input?.startsAt === "string" ? input.startsAt : "");
  const timezone = typeof input?.timezone === "string" ? input.timezone.trim() : "";
  const learnerLocation = typeof input?.learnerLocation === "string" ? input.learnerLocation.trim() : "";
  const idempotencyKey = typeof input?.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  const errors = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tutorSlug)) errors.push("Choose a valid tutor.");
  if (!format) errors.push("Choose a supported session format.");
  if (!examination) errors.push("Choose PSLE, JCE, or BGCSE.");
  if (subject.length < 2 || subject.length > 100) errors.push("Choose a valid subject.");
  if (!Number.isFinite(startsAt.getTime())) errors.push("Choose a valid lesson time.");
  if (!validTimezone(timezone)) errors.push("Choose a valid display timezone.");
  if (format === "student_place" && (learnerLocation.length < 5 || learnerLocation.length > 500)) errors.push("Enter the learner address (5–500 characters).");
  if (idempotencyKey.length < 8 || idempotencyKey.length > 100) errors.push("Idempotency key must be 8–100 characters.");
  return { value: { tutorSlug, format, examination, subject, startsAt, timezone, learnerLocation, idempotencyKey }, errors };
}

export function normalizeAvailabilityUpdate(input) {
  const sourceRules = Array.isArray(input?.rules) ? input.rules : [];
  const sourceExceptions = Array.isArray(input?.exceptions) ? input.exceptions : [];
  const sourceSubjects = Array.isArray(input?.settings?.subjects) ? input.settings.subjects : [];
  const sourceFormats = Array.isArray(input?.settings?.formats) ? input.settings.formats : [];
  const errors = [];
  const rules = sourceRules.map((rule, index) => {
    const weekday = Number(rule?.weekday);
    const format = normalizeSessionFormat(rule?.format);
    const timezone = typeof rule?.timezone === "string" ? rule.timezone.trim() : "";
    const localStartTime = typeof rule?.localStartTime === "string" ? rule.localStartTime : "";
    const localEndTime = typeof rule?.localEndTime === "string" ? rule.localEndTime : "";
    const slotDurationMinutes = Number(rule?.slotDurationMinutes);
    const leadTimeMinutes = Number(rule?.leadTimeMinutes);
    const bufferBeforeMinutes = Number(rule?.bufferBeforeMinutes);
    const bufferAfterMinutes = Number(rule?.bufferAfterMinutes);
    const effectiveFrom = typeof rule?.effectiveFrom === "string" ? rule.effectiveFrom : "";
    const effectiveUntil = typeof rule?.effectiveUntil === "string" && rule.effectiveUntil ? rule.effectiveUntil : null;
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) errors.push(`Rule ${index + 1} has an invalid weekday.`);
    if (!format) errors.push(`Rule ${index + 1} has an invalid format.`);
    if (!validTimezone(timezone)) errors.push(`Rule ${index + 1} has an invalid timezone.`);
    if (!/^\d{2}:\d{2}$/.test(localStartTime) || !/^\d{2}:\d{2}$/.test(localEndTime) || localEndTime <= localStartTime) errors.push(`Rule ${index + 1} has invalid local times.`);
    if (!Number.isInteger(slotDurationMinutes) || slotDurationMinutes < 15 || slotDurationMinutes > 240) errors.push(`Rule ${index + 1} has an invalid duration.`);
    if (![leadTimeMinutes, bufferBeforeMinutes, bufferAfterMinutes].every(value => Number.isInteger(value) && value >= 0 && value <= 10080)) errors.push(`Rule ${index + 1} has invalid lead or buffer time.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) || (effectiveUntil && (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveUntil) || effectiveUntil < effectiveFrom))) errors.push(`Rule ${index + 1} has invalid effective dates.`);
    return { weekday, format, timezone, local_start_time: localStartTime, local_end_time: localEndTime, slot_duration_minutes: slotDurationMinutes, lead_time_minutes: leadTimeMinutes, buffer_before_minutes: bufferBeforeMinutes, buffer_after_minutes: bufferAfterMinutes, effective_from: effectiveFrom, effective_until: effectiveUntil };
  });
  const exceptions = sourceExceptions.map((exception, index) => {
    const startsAt = new Date(typeof exception?.startsAt === "string" ? exception.startsAt : "");
    const endsAt = new Date(typeof exception?.endsAt === "string" ? exception.endsAt : "");
    const reason = typeof exception?.reason === "string" ? exception.reason.trim() : "";
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) errors.push(`Exception ${index + 1} has an invalid time range.`);
    if (reason.length > 500) errors.push(`Exception ${index + 1} reason is too long.`);
    return { starts_at: Number.isFinite(startsAt.getTime()) ? startsAt.toISOString() : "", ends_at: Number.isFinite(endsAt.getTime()) ? endsAt.toISOString() : "", available: Boolean(exception?.available), reason };
  });
  const subjects = sourceSubjects.map((subject, index) => {
    const examination = typeof subject?.examination === "string" && EXAM_LEVELS.includes(subject.examination) ? subject.examination : null;
    const name = typeof subject?.subject === "string" ? subject.subject.trim() : "";
    const priceCredits = Number(subject?.priceCredits);
    if (!examination || name.length < 2 || name.length > 100) errors.push(`Subject ${index + 1} is invalid.`);
    if (!Number.isInteger(priceCredits) || priceCredits < 1 || priceCredits > 100_000) errors.push(`Subject ${index + 1} has an invalid price.`);
    return { examination, subject: name, price_credits: priceCredits };
  });
  const formats = sourceFormats.map((format, index) => {
    const normalizedFormat = normalizeSessionFormat(format?.format);
    const groupCapacity = Number(format?.groupCapacity ?? 1);
    const locationNote = typeof format?.locationNote === "string" ? format.locationNote.trim() : "";
    if (!normalizedFormat) errors.push(`Format ${index + 1} is invalid.`);
    if (!Number.isInteger(groupCapacity) || groupCapacity < 1 || groupCapacity > 100) errors.push(`Format ${index + 1} has an invalid capacity.`);
    if (locationNote.length > 500) errors.push(`Format ${index + 1} location note is too long.`);
    return { format: normalizedFormat, group_capacity: groupCapacity, location_note: locationNote };
  });
  if (rules.length > 100 || exceptions.length > 200) errors.push("Availability update is too large.");
  if (subjects.length === 0 || formats.length === 0) errors.push("Approved subjects and formats are required.");
  return { value: { rules, exceptions, settings: { subjects, formats } }, errors };
}
