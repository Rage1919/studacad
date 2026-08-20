import "server-only";
import { appendAuditEvent } from "../db/repositories/audit-events";
import { requestId } from "./http-policy.mjs";
import type { Json } from "../db/models";

export async function appendCorrelatedAudit(input: {
  request: Request;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Json;
}) {
  return appendAuditEvent({
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    requestId: requestId(input.request.headers.get("x-request-id")),
    metadata: input.metadata ?? {},
  });
}
