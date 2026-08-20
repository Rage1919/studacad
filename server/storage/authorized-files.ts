import "server-only";
import { appendAuditEvent } from "../db/repositories/audit-events";
import { getDatabaseAdminClient } from "../db/client";
import { SupabasePrivateObjectStorage } from "./private-object-storage";

const storage = new SupabasePrivateObjectStorage();

export async function createAuthorizedPrivateDownload(input: {
  fileId: string;
  actorUserId: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const client = getDatabaseAdminClient();
  const { data: file, error: fileError } = await client
    .from("object_files")
    .select("*")
    .eq("id", input.fileId)
    .is("deleted_at", null)
    .single();

  if (fileError) throw new Error("Private file not found.", { cause: fileError });
  if (file.scan_status !== "clean") throw new Error("Private file is not available for download.");

  let authorized = file.owner_user_id === input.actorUserId;
  if (!authorized) {
    const { data: role, error: roleError } = await client
      .from("user_roles")
      .select("user_id")
      .eq("user_id", input.actorUserId)
      .eq("role", "admin")
      .is("revoked_at", null)
      .maybeSingle();
    if (roleError) throw new Error("Unable to verify private-file access.", { cause: roleError });
    authorized = role !== null;
  }

  if (!authorized) throw new Error("Private file access denied.");

  const signedUrl = await storage.createSignedDownloadUrl(file.object_key, input.expiresInSeconds);
  await appendAuditEvent({
    actorUserId: input.actorUserId,
    action: "private_file.download_url_issued",
    entityType: "object_file",
    entityId: file.id,
    metadata: { expiresInSeconds: input.expiresInSeconds ?? 300 }
  });
  return signedUrl;
}

export async function createAuthorizedLearningResourceDownload(input: {
  resourceId: string;
  learnerUserId: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const client = getDatabaseAdminClient();
  const resource = await client.from("course_resources").select("*").eq("id", input.resourceId).single();
  if (resource.error) throw new Error("Learning resource not found.", { cause: resource.error });
  const purchase = await client.from("course_purchases").select("*")
    .eq("learner_user_id", input.learnerUserId).eq("course_id", resource.data.course_id).eq("status", "completed").maybeSingle();
  if (purchase.error || !purchase.data) throw new Error("Learning resource access denied.", { cause: purchase.error ?? undefined });
  const file = await client.from("object_files").select("*").eq("id", resource.data.file_id).is("deleted_at", null).single();
  if (file.error || file.data.scan_status !== "clean") throw new Error("Learning resource is not available.", { cause: file.error ?? undefined });
  const signedUrl = await storage.createSignedDownloadUrl(file.data.object_key, input.expiresInSeconds);
  await appendAuditEvent({
    actorUserId: input.learnerUserId,
    action: "learning_resource.download_url_issued",
    entityType: "course_resource",
    entityId: resource.data.id,
    metadata: { expiresInSeconds: input.expiresInSeconds ?? 300 }
  });
  return signedUrl;
}
