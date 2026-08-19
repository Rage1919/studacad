const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizeSupportCase(input) {
  const category = String(input?.category ?? "");
  const subject = String(input?.subject ?? "").trim();
  const message = String(input?.message ?? "").trim();
  const bookingId = String(input?.bookingId ?? "").trim();
  const errors = [];
  if (
    ![
      "account",
      "booking",
      "payment",
      "tutor",
      "safety",
      "privacy",
      "accessibility",
      "technical",
      "other",
    ].includes(category)
  )
    errors.push("Choose a support category.");
  if (subject.length < 5 || subject.length > 150)
    errors.push("Subject must be 5 to 150 characters.");
  if (message.length < 10 || message.length > 5000)
    errors.push("Describe the issue in 10 to 5000 characters.");
  if (bookingId && !uuid.test(bookingId))
    errors.push("Booking reference is invalid.");
  return {
    errors,
    value: { category, subject, message, bookingId: bookingId || null },
  };
}
export function normalizeCaseMessage(input) {
  const caseId = String(input?.caseId ?? "").trim();
  const message = String(input?.message ?? "").trim();
  const internal = input?.internal === true;
  const errors = [];
  if (!uuid.test(caseId)) errors.push("Support case is invalid.");
  if (message.length < 5 || message.length > 5000)
    errors.push("Message must be 5 to 5000 characters.");
  return { errors, value: { caseId, message, internal } };
}
export function normalizeTutorReport(input) {
  const reason = String(input?.reason ?? "").trim();
  const bookingId = String(input?.bookingId ?? "").trim();
  const errors = [];
  if (reason.length < 10 || reason.length > 2000)
    errors.push("Describe the concern in 10 to 2000 characters.");
  if (bookingId && !uuid.test(bookingId))
    errors.push("Booking reference is invalid.");
  return { errors, value: { reason, bookingId: bookingId || null } };
}
export function normalizeAdminCase(input) {
  const caseId = String(input?.caseId ?? "").trim();
  const status = String(input?.status ?? "");
  const priority = String(input?.priority ?? "");
  const assigneeId = String(input?.assigneeId ?? "").trim();
  const note = String(input?.note ?? "").trim();
  const errors = [];
  if (!uuid.test(caseId)) errors.push("Support case is invalid.");
  if (
    !["open", "triaged", "waiting_on_user", "resolved", "closed"].includes(
      status,
    )
  )
    errors.push("Unsupported support status.");
  if (!["urgent", "high", "normal", "low"].includes(priority))
    errors.push("Unsupported support priority.");
  if (assigneeId && !uuid.test(assigneeId)) errors.push("Assignee is invalid.");
  return {
    errors,
    value: { caseId, status, priority, assigneeId: assigneeId || null, note },
  };
}
