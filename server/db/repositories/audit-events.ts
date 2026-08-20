import "server-only";
import { getDatabaseAdminClient } from "../client";
import type { AuditEvent, Json } from "../models";

export async function appendAuditEvent(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string | null;
  beforeState?: Json | null;
  afterState?: Json | null;
  metadata?: Json;
}): Promise<AuditEvent> {
  const { data, error } = await getDatabaseAdminClient()
    .from("audit_events")
    .insert({
      actor_user_id: input.actorUserId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      request_id: input.requestId ?? null,
      ip_hash: null,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
      metadata: input.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) throw new Error("Unable to append the audit event.", { cause: error });
  return data;
}
