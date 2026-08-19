import "server-only";
import { getDatabaseAdminClient } from "../db/client";
import type { Viewer } from "../auth/viewer";
export class SupportError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
    this.name = "SupportError";
  }
}
const fail = (error: { message?: string } | null, fallback: string) => {
  const text = error?.message ?? "";
  const safe = [
    "Complete the support request",
    "Booking not found",
    "Support case not found",
    "Support case access denied",
    "Tutor not found",
    "Valid tutor report required",
    "Administrator role required",
  ].find((item) => text.includes(item));
  throw new SupportError(safe ?? fallback, safe ? 400 : 500);
};
export async function listOwnSupportCases(viewer: Viewer) {
  const db = getDatabaseAdminClient();
  const cases = await db
    .from("support_cases")
    .select("*")
    .eq("requester_user_id", viewer.id)
    .order("created_at", { ascending: false });
  if (cases.error) fail(cases.error, "Unable to load support cases.");
  const ids = (cases.data ?? []).map((item) => item.id);
  const messages = ids.length
    ? await db
        .from("support_case_messages")
        .select("*")
        .in("support_case_id", ids)
        .eq("internal", false)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (messages.error) fail(messages.error, "Unable to load support messages.");
  return { cases: cases.data ?? [], messages: messages.data ?? [] };
}
export async function createSupportCase(
  viewer: Viewer,
  input: {
    category: string;
    subject: string;
    message: string;
    bookingId: string | null;
  },
) {
  const result = await getDatabaseAdminClient().rpc("create_support_case", {
    p_user: viewer.id,
    p_category: input.category,
    p_subject: input.subject,
    p_message: input.message,
    p_booking: input.bookingId,
  });
  if (result.error) fail(result.error, "Unable to create support case.");
  return result.data;
}
export async function addSupportMessage(
  viewer: Viewer,
  input: { caseId: string; message: string; internal: boolean },
) {
  const result = await getDatabaseAdminClient().rpc(
    "add_support_case_message",
    {
      p_actor: viewer.id,
      p_case: input.caseId,
      p_body: input.message,
      p_internal: input.internal,
    },
  );
  if (result.error) fail(result.error, "Unable to add support message.");
  return result.data;
}
export async function reportTutor(
  viewer: Viewer,
  slug: string,
  input: { reason: string; bookingId: string | null },
) {
  const result = await getDatabaseAdminClient().rpc("report_tutor", {
    p_user: viewer.id,
    p_tutor_slug: slug,
    p_reason: input.reason,
    p_booking: input.bookingId,
  });
  if (result.error) fail(result.error, "Unable to report this tutor.");
  return result.data;
}
export async function getAdminSupport() {
  const db = getDatabaseAdminClient();
  const [cases, messages, reports, accounts] = await Promise.all([
    db
      .from("support_cases")
      .select("*")
      .order("response_due_at", { ascending: true })
      .limit(300),
    db
      .from("support_case_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1000),
    db
      .from("tutor_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("user_accounts")
      .select("*")
      .order("display_name", { ascending: true }),
  ]);
  if (cases.error || messages.error || reports.error || accounts.error)
    fail(
      cases.error ?? messages.error ?? reports.error ?? accounts.error,
      "Unable to load support operations.",
    );
  return {
    cases: cases.data ?? [],
    messages: messages.data ?? [],
    reports: reports.data ?? [],
    accounts: accounts.data ?? [],
  };
}
export async function updateSupportCase(
  viewer: Viewer,
  input: {
    caseId: string;
    status: string;
    priority: string;
    assigneeId: string | null;
    note: string;
  },
) {
  const result = await getDatabaseAdminClient().rpc(
    "admin_update_support_case",
    {
      p_actor: viewer.id,
      p_case: input.caseId,
      p_status: input.status,
      p_priority: input.priority,
      p_assignee: input.assigneeId,
      p_note: input.note || null,
    },
  );
  if (result.error) fail(result.error, "Unable to update support case.");
  return result.data;
}
export async function getPolicyReviewRegister() {
  const db = getDatabaseAdminClient();
  const [documents, reviews] = await Promise.all([
    db
      .from("policy_documents")
      .select("*")
      .eq("status", "current")
      .order("key", { ascending: true }),
    db
      .from("policy_reviews")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  if (documents.error || reviews.error)
    fail(documents.error ?? reviews.error, "Unable to load policy register.");
  return { documents: documents.data ?? [], reviews: reviews.data ?? [] };
}
export async function recordPolicyReview(
  viewer: Viewer,
  input: {
    version: string;
    kind: string;
    reviewer: string;
    outcome: string;
    evidence: string;
    nextReview: string;
  },
) {
  const result = await getDatabaseAdminClient().rpc("record_policy_review", {
    p_actor: viewer.id,
    p_version: input.version,
    p_kind: input.kind,
    p_reviewer: input.reviewer,
    p_outcome: input.outcome,
    p_evidence: input.evidence,
    p_next_review: input.nextReview,
  });
  if (result.error) fail(result.error, "Unable to record policy review.");
  return result.data;
}
export async function acceptPolicies(
  viewer: Viewer,
  keys: string[],
  context: string,
  reference: string,
) {
  const result = await getDatabaseAdminClient().rpc("accept_current_policies", {
    p_user: viewer.id,
    p_keys: keys,
    p_context: context,
    p_reference: reference,
    p_ip_hash: null,
  });
  if (result.error) fail(result.error, "Unable to record policy acceptance.");
  return result.data;
}
export function supportErrorResponse(error: unknown) {
  if (error instanceof SupportError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  throw error;
}
