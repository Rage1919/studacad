import "server-only";
import { getDatabaseAdminClient } from "../db/client";
import { appendAuditEvent } from "../db/repositories/audit-events";
import type {
  Json,
  ObjectFile,
  PublicTutorMarketplaceProfile,
  TutorApplication,
  TutorApplicationDocument,
  TutorApplicationFormat,
  TutorApplicationReview,
  TutorApplicationStatus,
  TutorApplicationSubject,
  TutorQualification,
  UserAccount,
} from "../db/models";
import {
  applicationIsEditable,
  normalizeApplicationPayload,
  validateApplicationPayload,
} from "./policy.mjs";
import type { TutorApplicationView, TutorDocumentSummary } from "./types";

export class TutorOnboardingError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TutorOnboardingError";
  }
}

const databaseError = (
  error: { code?: string; message?: string } | null,
  fallback: string,
) => {
  if (!error) return new TutorOnboardingError(fallback, 500);
  if (error.code === "42501")
    return new TutorOnboardingError(
      "You do not have permission to perform this action.",
      403,
    );
  if (["23505", "55000"].includes(error.code ?? ""))
    return new TutorOnboardingError(error.message || fallback, 409);
  if (error.code === "23514")
    return new TutorOnboardingError(error.message || fallback, 422);
  return new TutorOnboardingError(fallback, 500);
};

const asAvailability = (value: Json) => {
  if (!value || Array.isArray(value) || typeof value !== "object")
    return { days: [], startTime: "16:00", endTime: "19:00" };
  return {
    days: Array.isArray(value.days)
      ? (value.days.filter((item) => typeof item === "string") as string[])
      : [],
    startTime: typeof value.startTime === "string" ? value.startTime : "16:00",
    endTime: typeof value.endTime === "string" ? value.endTime : "19:00",
  };
};

async function hydrateApplication(
  application: TutorApplication,
  applicant?: Pick<UserAccount, "display_name" | "email">,
): Promise<TutorApplicationView> {
  const database = getDatabaseAdminClient();
  const [
    subjectsResult,
    formatsResult,
    qualificationsResult,
    documentsResult,
    reviewsResult,
  ] = await Promise.all([
    database
      .from("tutor_application_subjects")
      .select("*")
      .eq("application_id", application.id),
    database
      .from("tutor_application_formats")
      .select("*")
      .eq("application_id", application.id),
    database
      .from("tutor_qualifications")
      .select("*")
      .eq("application_id", application.id)
      .order("created_at", { ascending: false })
      .limit(1),
    database
      .from("tutor_application_documents")
      .select("*")
      .eq("application_id", application.id),
    database
      .from("tutor_application_reviews")
      .select("*")
      .eq("application_id", application.id)
      .order("created_at", { ascending: false }),
  ]);
  const firstError = [
    subjectsResult.error,
    formatsResult.error,
    qualificationsResult.error,
    documentsResult.error,
    reviewsResult.error,
  ].find(Boolean);
  if (firstError)
    throw databaseError(firstError, "Unable to load the tutor application.");

  const links = (documentsResult.data ?? []) as TutorApplicationDocument[];
  let files: ObjectFile[] = [];
  if (links.length) {
    const filesResult = await database
      .from("object_files")
      .select("*")
      .in(
        "id",
        links.map((item) => item.file_id),
      )
      .is("deleted_at", null);
    if (filesResult.error)
      throw databaseError(
        filesResult.error,
        "Unable to load application documents.",
      );
    files = filesResult.data as ObjectFile[];
  }
  const filesById = new Map(files.map((file) => [file.id, file]));
  const documents: TutorDocumentSummary[] = links.flatMap((link) => {
    const file = filesById.get(link.file_id);
    return file
      ? [
          {
            fileId: file.id,
            documentType:
              link.document_type as TutorDocumentSummary["documentType"],
            filename: file.original_filename,
            contentType: file.content_type,
            sizeBytes: file.size_bytes,
            scanStatus: file.scan_status,
            uploadedAt: file.created_at,
          },
        ]
      : [];
  });
  const subjects = (subjectsResult.data ?? []) as TutorApplicationSubject[];
  const formats = (formatsResult.data ?? []) as TutorApplicationFormat[];
  const qualification = (
    (qualificationsResult.data ?? []) as TutorQualification[]
  )[0];
  const reviews = (reviewsResult.data ?? []) as TutorApplicationReview[];
  const availability = asAvailability(application.availability);

  return {
    id: application.id,
    status: application.status,
    version: application.version,
    editable: applicationIsEditable(application.status),
    applicantName: applicant?.display_name,
    applicantEmail: applicant?.email,
    payload: {
      legalName: application.legal_name ?? "",
      phone: application.phone_e164 ?? "",
      district: application.district ?? "",
      town: application.location ?? "",
      headline: application.headline ?? "",
      biography: application.biography ?? "",
      teachingExperience: application.teaching_experience ?? "",
      qualification: qualification?.title ?? "",
      institution: qualification?.institution ?? "",
      languages: application.languages.join(", "),
      levels: [...new Set(subjects.map((item) => item.examination))],
      subjects: [...new Set(subjects.map((item) => item.subject))],
      formats: formats.map((item) => item.format),
      basePriceCredits: application.base_price_credits ?? 0,
      sessionDurationMinutes: application.session_duration_minutes ?? 60,
      days: availability.days,
      startTime: availability.startTime,
      endTime: availability.endTime,
      consent: Boolean(application.consented_at),
    },
    documents,
    latestApplicantMessage:
      reviews.find((review) => review.applicant_message)?.applicant_message ??
      null,
    submittedAt: application.submitted_at,
    reviewedAt: application.reviewed_at,
    updatedAt: application.updated_at,
  };
}

export async function getLatestApplicantApplication(
  applicantUserId: string,
): Promise<TutorApplicationView | null> {
  const result = await getDatabaseAdminClient()
    .from("tutor_applications")
    .select("*")
    .eq("applicant_user_id", applicantUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error)
    throw databaseError(result.error, "Unable to load your tutor application.");
  return result.data
    ? hydrateApplication(result.data as TutorApplication)
    : null;
}

export async function assertEditableApplicantApplication(
  applicantUserId: string,
  applicationId: string,
): Promise<void> {
  const result = await getDatabaseAdminClient()
    .from("tutor_applications")
    .select("id")
    .eq("id", applicationId)
    .eq("applicant_user_id", applicantUserId)
    .in("status", ["draft", "changes_requested"])
    .maybeSingle();
  if (result.error)
    throw databaseError(
      result.error,
      "Unable to verify the tutor application.",
    );
  if (!result.data)
    throw new TutorOnboardingError("Tutor application is not editable.", 403);
}

export async function saveApplicantApplication(
  applicantUserId: string,
  applicationId: string | null,
  input: unknown,
): Promise<TutorApplicationView> {
  const payload = normalizeApplicationPayload(input);
  const problems = validateApplicationPayload(payload);
  if (problems.length) throw new TutorOnboardingError(problems[0], 422);
  const subjectEntries = payload.levels.flatMap((examination) =>
    payload.subjects.map((subject) => ({ examination, subject })),
  );
  const result = await getDatabaseAdminClient().rpc("save_tutor_application", {
    p_applicant_user_id: applicantUserId,
    p_application_id: applicationId,
    p_payload: { ...payload, subjectEntries } as Json,
  });
  if (result.error || !result.data)
    throw databaseError(result.error, "Unable to save the tutor application.");
  const application = await getDatabaseAdminClient()
    .from("tutor_applications")
    .select("*")
    .eq("id", result.data)
    .single();
  if (application.error)
    throw databaseError(
      application.error,
      "Unable to reload the tutor application.",
    );
  return hydrateApplication(application.data as TutorApplication);
}

export async function transitionTutorApplication(input: {
  actorUserId: string;
  applicationId: string;
  targetStatus: TutorApplicationStatus;
  internalNote?: string | null;
  applicantMessage?: string | null;
}): Promise<TutorApplicationStatus> {
  const result = await getDatabaseAdminClient().rpc(
    "transition_tutor_application",
    {
      p_actor_user_id: input.actorUserId,
      p_application_id: input.applicationId,
      p_target_status: input.targetStatus,
      p_internal_note: input.internalNote ?? null,
      p_applicant_message: input.applicantMessage ?? null,
    },
  );
  if (result.error)
    throw databaseError(
      result.error,
      "Unable to update the application status.",
    );
  return result.data;
}

export async function registerTutorDocument(input: {
  applicantUserId: string;
  applicationId: string;
  documentType: string;
  kind: ObjectFile["kind"];
  objectKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  scanReference: string;
}): Promise<string> {
  const result = await getDatabaseAdminClient().rpc(
    "register_tutor_application_document",
    {
      p_applicant_user_id: input.applicantUserId,
      p_application_id: input.applicationId,
      p_document_type: input.documentType,
      p_kind: input.kind,
      p_object_key: input.objectKey,
      p_original_filename: input.filename,
      p_content_type: input.contentType,
      p_size_bytes: input.sizeBytes,
      p_checksum_sha256: input.checksumSha256,
      p_scan_provider_reference: input.scanReference,
    },
  );
  if (result.error || !result.data)
    throw databaseError(
      result.error,
      "Unable to register the application document.",
    );
  return result.data;
}

export async function listTutorApplicationsForReview(): Promise<
  TutorApplicationView[]
> {
  const result = await getDatabaseAdminClient()
    .from("tutor_applications")
    .select("*")
    .in("status", [
      "submitted",
      "under_review",
      "changes_requested",
      "approved",
      "suspended",
    ])
    .order("updated_at", { ascending: false })
    .limit(100);
  if (result.error)
    throw databaseError(result.error, "Unable to load the tutor review queue.");
  const applications = result.data as TutorApplication[];
  if (!applications.length) return [];
  const accountsResult = await getDatabaseAdminClient()
    .from("user_accounts")
    .select("*")
    .in("id", [...new Set(applications.map((item) => item.applicant_user_id))]);
  if (accountsResult.error)
    throw databaseError(
      accountsResult.error,
      "Unable to load tutor applicants.",
    );
  const accounts = new Map(
    (accountsResult.data as UserAccount[]).map((account) => [
      account.id,
      account,
    ]),
  );
  return Promise.all(
    applications.map((application) =>
      hydrateApplication(
        application,
        accounts.get(application.applicant_user_id),
      ),
    ),
  );
}

export async function createTutorDocumentDownload(
  fileId: string,
  viewer: { id: string; roles: string[] },
): Promise<string> {
  const database = getDatabaseAdminClient();
  const fileResult = await database
    .from("object_files")
    .select("*")
    .eq("id", fileId)
    .is("deleted_at", null)
    .single();
  if (fileResult.error)
    throw new TutorOnboardingError("Document not found.", 404);
  const file = fileResult.data as ObjectFile;
  if (file.owner_user_id !== viewer.id && !viewer.roles.includes("admin"))
    throw new TutorOnboardingError(
      "You do not have permission to view this document.",
      403,
    );
  const signed = await database.storage
    .from(file.bucket)
    .createSignedUrl(file.object_key, 60, { download: file.original_filename });
  if (signed.error || !signed.data.signedUrl)
    throw new TutorOnboardingError(
      "Unable to create the private document link.",
      503,
    );
  await appendAuditEvent({
    actorUserId: viewer.id,
    action: "tutor_application.document_accessed",
    entityType: "object_file",
    entityId: file.id,
  });
  return signed.data.signedUrl;
}

export type PublicTutorDto = {
  id: string;
  profileId: string;
  name: string;
  examination: "PSLE" | "JCE" | "BGCSE";
  subject: string;
  rating: string;
  lessons: string;
  price: number;
  color: string;
  image: string;
  location: string;
  experience: string;
  headline: string;
  about: string;
  specialties: string[];
  approach: string[];
  availability: string[];
  availabilityGroups: Array<"Today" | "Tomorrow" | "Weekdays" | "Weekend">;
  sessionFormats: Array<
    "online-1to1" | "online-group" | "tutor-place" | "student-place"
  >;
  introVideo: string;
  resume: {
    education: string[];
    experience: Array<{ role: string; organisation: string; period: string }>;
    certifications: string[];
  };
};

const mapPublicTutor = async (
  profile: PublicTutorMarketplaceProfile,
): Promise<PublicTutorDto | null> => {
  const subjectItems = Array.isArray(profile.subjects)
    ? (profile.subjects.filter(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      ) as Array<Record<string, Json | undefined>>)
    : [];
  const primary = subjectItems[0];
  if (
    !primary ||
    typeof primary.examination !== "string" ||
    typeof primary.subject !== "string"
  )
    return null;
  const signed = await getDatabaseAdminClient()
    .storage.from("studacad-private")
    .createSignedUrl(profile.profile_image_object_key, 900);
  if (signed.error || !signed.data.signedUrl) return null;
  const formats = Array.isArray(profile.formats)
    ? (profile.formats
        .filter((item) => typeof item === "string")
        .map((item) =>
          item.replaceAll("_", "-"),
        ) as PublicTutorDto["sessionFormats"])
    : [];
  return {
    id: profile.slug,
    profileId: profile.id,
    name: profile.display_name,
    examination: primary.examination as PublicTutorDto["examination"],
    subject: primary.subject,
    rating: Number(profile.average_rating).toFixed(1),
    lessons: `${profile.completed_booking_count.toLocaleString()} lessons`,
    price: profile.base_price_credits,
    color: "blue",
    image: signed.data.signedUrl,
    location: `${profile.location}, Botswana`,
    experience: profile.teaching_experience ?? "",
    headline: profile.headline,
    about: profile.about,
    specialties: subjectItems.map(
      (item) => `${item.examination} ${item.subject}`,
    ),
    approach: [],
    availability: [],
    availabilityGroups: [],
    sessionFormats: formats,
    introVideo: "",
    resume: {
      education: [],
      experience: [],
      certifications: ["Verification review completed by Studacad"],
    },
  };
};

export async function listPublicTutors(
  slug?: string,
): Promise<PublicTutorDto[]> {
  let query = getDatabaseAdminClient()
    .from("public_tutor_marketplace_profiles")
    .select("*")
    .order("published_at", { ascending: false });
  if (slug) query = query.eq("slug", slug);
  const result = await query.limit(slug ? 1 : 100);
  if (result.error)
    throw databaseError(result.error, "Unable to load published tutors.");
  const mapped = await Promise.all(
    (result.data as PublicTutorMarketplaceProfile[]).map(mapPublicTutor),
  );
  return mapped.filter((item): item is PublicTutorDto => Boolean(item));
}

export function onboardingErrorResponse(error: unknown): Response {
  if (error instanceof TutorOnboardingError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  throw error;
}
