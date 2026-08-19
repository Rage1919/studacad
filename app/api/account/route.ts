import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";
import { appendAuditEvent } from "../../../server/db/repositories/audit-events";
import { requestAccountDeletion, updateOwnProfile } from "../../../server/db/repositories/user-accounts";
import { createServerAuthClient } from "../../../server/auth/client";

const authorizeMutation = (request: Request) => assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);

export async function PATCH(request: Request) {
  try {
    authorizeMutation(request);
    const viewer = await requireViewer();
    const body = await request.json().catch(() => null) as { displayName?: unknown; phoneE164?: unknown; timezone?: unknown } | null;
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    const timezone = typeof body?.timezone === "string" ? body.timezone.trim() : "";
    const phoneE164 = typeof body?.phoneE164 === "string" && body.phoneE164.trim() ? body.phoneE164.trim() : null;
    if (displayName.length < 2 || displayName.length > 100) return Response.json({ error: "Display name must be 2–100 characters." }, { status: 400 });
    if (!/^[A-Za-z_]+(?:\/[A-Za-z_+-]+)+$/.test(timezone)) return Response.json({ error: "Enter a valid timezone." }, { status: 400 });
    if (phoneE164 && !/^\+[1-9][0-9]{7,14}$/.test(phoneE164)) return Response.json({ error: "Use an international phone number such as +267…" }, { status: 400 });

    const account = await updateOwnProfile(viewer.id, { displayName, phoneE164, timezone });
    await appendAuditEvent({ actorUserId: viewer.id, action: "account.profile_updated", entityType: "user_account", entityId: viewer.id });
    return Response.json({ profile: { displayName: account.display_name, phoneE164: account.phone_e164, timezone: account.timezone } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    authorizeMutation(request);
    const viewer = await requireViewer();
    await requestAccountDeletion(viewer.id);
    await appendAuditEvent({ actorUserId: viewer.id, action: "account.deletion_requested", entityType: "user_account", entityId: viewer.id });
    const { client } = await createServerAuthClient();
    await client.auth.signOut({ scope: "global" });
    return Response.json({ deletionRequested: true });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    return authErrorResponse(error);
  }
}
