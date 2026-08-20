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
