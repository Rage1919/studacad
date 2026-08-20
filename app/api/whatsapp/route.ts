import { getDatabaseAdminClient } from "../../../server/db/client";
import { applyWhatsAppWebhook } from "../../../server/messages/repository";
import {
  sha256Hex,
  verifyHmacSha256,
} from "../../../server/security/webhook-policy.mjs";

type WhatsAppPayload = {
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        messages?: Array<{
          id?: string;
          from?: string;
          context?: { id?: string };
          text?: { body?: string };
        }>;
        statuses?: Array<{ id?: string; status?: string; timestamp?: string }>;
      };
    }>;
  }>;
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const verified =
    params.get("hub.mode") === "subscribe" &&
    Boolean(process.env.WHATSAPP_VERIFY_TOKEN) &&
    params.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN;
  return verified
    ? new Response(params.get("hub.challenge") ?? "", { status: 200 })
    : new Response("Verification failed", { status: 403 });
}

export async function POST(request: Request) {
  const rawPayload = await request.text();
  if (
    !(await verifyHmacSha256({
      payload: rawPayload,
      signature: request.headers.get("x-hub-signature-256"),
      secret: process.env.WHATSAPP_APP_SECRET,
      environmentName: process.env.STUDACAD_ENV,
    }))
  )
    return new Response("Invalid signature", { status: 401 });

  let payload: WhatsAppPayload;
  try {
    payload = JSON.parse(rawPayload || "{}");
  } catch {
    return Response.json(
      { error: "Invalid webhook payload." },
      { status: 400 },
    );
  }
  const payloadSha256 = await sha256Hex(rawPayload);
  const providerIds = (payload.entry ?? []).flatMap((entry) => {
    const ids = (entry.changes ?? []).flatMap((change) => [
      ...(change.value?.messages ?? []).flatMap((message) =>
        message.id ? [message.id] : [],
      ),
      ...(change.value?.statuses ?? []).flatMap((status) =>
        status.id ? [status.id] : [],
      ),
    ]);
    return ids.length ? ids : entry.id ? [entry.id] : [];
  });
  const providerEventId = providerIds.join(":") || payloadSha256;
  const database = getDatabaseAdminClient();
  let registered = await database
    .from("provider_webhook_events")
    .insert({
      provider: "whatsapp",
      provider_event_id: providerEventId,
      event_type: "messages",
      payload_sha256: payloadSha256,
      status: "received",
    })
    .select("*")
    .single();
  if (registered.error) {
    if (registered.error.code !== "23505")
      return Response.json(
        { error: "Unable to register webhook delivery." },
        { status: 503 },
      );
    const existing = await database
      .from("provider_webhook_events")
      .select("*")
      .eq("provider", "whatsapp")
      .eq("provider_event_id", providerEventId)
      .single();
    if (existing.error || existing.data.status !== "failed")
      return Response.json({ received: true, replayed: true });
    registered = await database
      .from("provider_webhook_events")
      .update({ status: "received", failure_reason: null })
      .eq("id", existing.data.id)
      .select("*")
      .single();
    if (registered.error)
      return Response.json(
        { error: "Unable to retry webhook delivery." },
        { status: 503 },
      );
  }

  try {
    const applied = await applyWhatsAppWebhook(payload);
    const processed = await database
      .from("provider_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", registered.data.id);
    if (processed.error) throw new Error("finalize_failed");
    return Response.json({ received: true, replayed: false, ...applied });
  } catch {
    await database
      .from("provider_webhook_events")
      .update({ status: "failed", failure_reason: "processing_failed" })
      .eq("id", registered.data.id);
    return Response.json(
      { error: "Unable to process webhook delivery." },
      { status: 503 },
    );
  }
}
