import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import {
  authErrorResponse,
  requireViewer,
} from "../../../../server/auth/viewer";
import {
  normalizeAdminCase,
  normalizeCaseMessage,
} from "../../../../server/support/policy.mjs";
import {
  addSupportMessage,
  getAdminSupport,
  supportErrorResponse,
  updateSupportCase,
} from "../../../../server/support/repository";
export async function GET() {
  try {
    await requireViewer(["admin"]);
    return Response.json(await getAdminSupport(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch {
      return supportErrorResponse(error);
    }
  }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["admin"]);
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (body?.action === "message") {
      const normalized = normalizeCaseMessage(body);
      if (normalized.errors.length)
        return Response.json({ error: normalized.errors[0] }, { status: 400 });
      return Response.json({
        messageId: await addSupportMessage(viewer, normalized.value),
      });
    }
    const normalized = normalizeAdminCase(body);
    if (normalized.errors.length)
      return Response.json({ error: normalized.errors[0] }, { status: 400 });
    return Response.json({
      status: await updateSupportCase(viewer, normalized.value),
    });
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    try {
      return authErrorResponse(error);
    } catch {
      return supportErrorResponse(error);
    }
  }
}
