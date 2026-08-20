import { createHash, randomUUID } from "node:crypto";
import { readRuntimeEnvironment } from "../../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../../../server/auth/viewer";
import { getDatabaseAdminClient } from "../../../../../server/db/client";
import { appendAuditEvent } from "../../../../../server/db/repositories/audit-events";
import { readDatabaseEnvironment } from "../../../../../server/database-env.mjs";
import { contentMatchesSignature, uploadPolicy, validateUploadMetadata } from "../../../../../server/tutor-onboarding/policy.mjs";
import { MalwareScannerUnavailableError, scanUpload } from "../../../../../server/tutor-onboarding/malware-scanner.mjs";
import { assertEditableApplicantApplication, onboardingErrorResponse, registerTutorDocument, TutorOnboardingError } from "../../../../../server/tutor-onboarding/repository";

const safeFilename = (value: string) => value.normalize("NFKC").replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "-").slice(0, 180) || "document";

export async function POST(request: Request, context: { params: Promise<{ applicationId: string }> }) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const { applicationId } = await context.params;
    await assertEditableApplicantApplication(viewer.id, applicationId);
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 11_000_000) throw new TutorOnboardingError("The upload request is too large.", 413);
    const formData = await request.formData();
    const documentType = typeof formData.get("documentType") === "string" ? String(formData.get("documentType")) : "";
    const file = formData.get("file");
    if (!(file instanceof File)) throw new TutorOnboardingError("Choose a file to upload.", 422);
    const problems = validateUploadMetadata(documentType, file);
    if (problems.length) throw new TutorOnboardingError(problems[0], 422);
    const policy = uploadPolicy(documentType);
    if (!policy) throw new TutorOnboardingError("Choose a supported document type.", 422);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!contentMatchesSignature(bytes, file.type)) throw new TutorOnboardingError("The file contents do not match its declared type.", 422);
    const scan = await scanUpload({ bytes, filename: safeFilename(file.name), contentType: file.type });
    if (!scan.clean) {
      await appendAuditEvent({
        actorUserId: viewer.id,
        action: "tutor_application.document_rejected",
        entityType: "tutor_application",
        entityId: applicationId,
        metadata: { documentType, scanReference: scan.reference }
      });
      throw new TutorOnboardingError("The security scan rejected this file.", 422);
    }

    const databaseEnvironment = readDatabaseEnvironment(process.env);
    const objectKey = `${viewer.id}/tutor-applications/${applicationId}/${randomUUID()}`;
    const storage = getDatabaseAdminClient().storage.from(databaseEnvironment.privateBucket);
    const uploaded = await storage.upload(objectKey, bytes, { contentType: file.type, upsert: false, cacheControl: "0" });
    if (uploaded.error) throw new TutorOnboardingError("Unable to store the private document.", 503);
    try {
      const fileId = await registerTutorDocument({
        applicantUserId: viewer.id,
        applicationId,
        documentType,
        kind: policy.kind,
        objectKey,
        filename: safeFilename(file.name),
        contentType: file.type,
        sizeBytes: file.size,
        checksumSha256: createHash("sha256").update(bytes).digest("hex"),
        scanReference: scan.reference
      });
      return Response.json({ fileId, documentType, scanStatus: "clean" }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      await storage.remove([objectKey]);
      throw error;
    }
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    if (error instanceof MalwareScannerUnavailableError) return Response.json({ error: error.message }, { status: 503 });
    try { return authErrorResponse(error); } catch { return onboardingErrorResponse(error); }
  }
}
