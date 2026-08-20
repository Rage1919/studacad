import { getDatabaseAdminClient } from "../../../../server/db/client";
import {
  applyEmailProviderEvent,
  notificationErrorResponse,
} from "../../../../server/notifications/repository";
import {
  sha256Hex,
  verifyHmacSha256,
} from "../../../../server/security/webhook-policy.mjs";
export async function POST(request: Request) {
  const raw = await request.text();
  if (
    !(await verifyHmacSha256({
      payload: raw,
      signature: request.headers.get("x-studacad-signature"),
      secret: process.env.NOTIFICATION_EMAIL_WEBHOOK_SECRET,
      environmentName: process.env.STUDACAD_ENV,
    }))
  )
    return new Response("Invalid signature", { status: 401 });
  let body: {
    eventId?: string;
    type?: string;
    notificationId?: string;
    userId?: string;
    providerMessageId?: string;
  };
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return Response.json(
      { error: "Invalid webhook payload." },
      { status: 400 },
    );
  }
  if (
    !body.eventId ||
    !["delivered", "bounce", "complaint"].includes(body.type ?? "") ||
    ![body.notificationId, body.userId, body.providerMessageId].every(
      (value) => typeof value === "string" && value.length >= 3,
    )
  )
    return Response.json({ error: "Invalid webhook event." }, { status: 400 });
  const db = getDatabaseAdminClient();
  const hash = await sha256Hex(raw);
  const registered = await db
    .from("provider_webhook_events")
    .insert({
      provider: "notification_email",
      provider_event_id: body.eventId,
      event_type: body.type!,
      payload_sha256: hash,
      status: "received",
    })
    .select("*")
    .single();
  if (registered.error) {
    if (registered.error.code === "23505")
      return Response.json({ received: true, replayed: true });
    return Response.json(
      { error: "Unable to register webhook delivery." },
      { status: 503 },
    );
  }
  try {
    const result = await applyEmailProviderEvent({
      eventId: body.eventId,
      type: body.type as "delivered" | "bounce" | "complaint",
      notificationId: body.notificationId!,
      userId: body.userId!,
      providerMessageId: body.providerMessageId!,
    });
    await db
      .from("provider_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", registered.data.id);
    return Response.json({ received: true, replayed: false, ...result });
  } catch (error) {
    await db
      .from("provider_webhook_events")
      .update({ status: "failed", failure_reason: "processing_failed" })
      .eq("id", registered.data.id);
    try {
      return notificationErrorResponse(error);
    } catch {
      return Response.json(
        { error: "Unable to process webhook delivery." },
        { status: 503 },
      );
    }
  }
}
