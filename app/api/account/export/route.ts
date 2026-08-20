import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../../server/auth/viewer";
import { appendAuditEvent } from "../../../../server/db/repositories/audit-events";
import { requestAccountExport } from "../../../../server/db/repositories/user-accounts";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    await requestAccountExport(viewer.id);
    await appendAuditEvent({ actorUserId: viewer.id, action: "account.export_requested", entityType: "user_account", entityId: viewer.id });
    return Response.json({ exportRequested: true });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    return authErrorResponse(error);
  }
}
