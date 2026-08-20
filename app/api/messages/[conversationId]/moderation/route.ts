import { readRuntimeEnvironment } from "../../../../../server/runtime-env.mjs";
import {
  assertSameOrigin,
  CsrfError,
} from "../../../../../server/auth/csrf.mjs";
import {
  authErrorResponse,
  requireViewer,
} from "../../../../../server/auth/viewer";
import { normalizeModerationRequest } from "../../../../../server/messages/policy.mjs";
import {
  messagingErrorResponse,
  moderateConversation,
} from "../../../../../server/messages/repository";

export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const { conversationId } = await context.params;
    const normalized = normalizeModerationRequest(
      await request.json().catch(() => null),
    );
    if (normalized.errors.length || !normalized.value.action)
      return Response.json(
        { error: normalized.errors[0] ?? "Invalid moderation request." },
        { status: 400 },
      );
    return Response.json({
      result: await moderateConversation({
        viewer,
        conversationId,
        ...normalized.value,
        action: normalized.value.action,
      }),
    });
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    try {
      return authErrorResponse(error);
    } catch {
      return messagingErrorResponse(error);
    }
  }
}
