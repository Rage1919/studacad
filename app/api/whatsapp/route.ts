import { tutors } from "../../lib/tutors";
import { saveTutorMessage } from "../../lib/tutorMessages";
import { getDatabaseAdminClient } from "../../../server/db/client";
import {
  sha256Hex,
  verifyHmacSha256,
} from "../../../server/security/webhook-policy.mjs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const isSubscription = params.get("hub.mode") === "subscribe";
  const isVerified =
    params.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN;
  const challenge = params.get("hub.challenge") ?? "";
  return isSubscription && isVerified
    ? new Response(challenge, { status: 200 })
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
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = (() => {
    try {
      return JSON.parse(rawPayload || "{}");
    } catch {
      return null;
    }
  })() as {
    entry?: Array<{
      id?: string;
      changes?: Array<{
        field?: string;
        value?: {
          messages?: Array<{
            id?: string;
            from?: string;
            timestamp?: string;
            text?: { body?: string };
          }>;
        };
      }>;
    }>;
  } | null;
  if (!payload)
    return Response.json(
      { error: "Invalid webhook payload." },
      { status: 400 },
    );
  const payloadSha256 = await sha256Hex(rawPayload);
  const eventIds = (payload.entry ?? []).flatMap((entry) => {
    const messageIds = (entry.changes ?? []).flatMap((change) =>
      (change.value?.messages ?? []).flatMap((message) =>
        message.id ? [message.id] : [],
      ),
    );
    return messageIds.length ? messageIds : entry.id ? [entry.id] : [];
  });
  const providerEventId = eventIds.join(":") || payloadSha256;
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

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const inbound of change.value?.messages ?? []) {
        const tutor = tutors.find(
          (item) => item.whatsappNumber === inbound.from,
        );
        const text = inbound.text?.body?.trim();
        if (!tutor || !text) continue;
        saveTutorMessage({
          id:
            inbound.id ||
            `wa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          tutorId: tutor.id,
          tutorName: tutor.name,
          text,
          direction: "inbound",
          channel: "whatsapp",
          status: "received",
          createdAt: inbound.timestamp
            ? new Date(Number(inbound.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          whatsappMessageId: inbound.id,
        });
      }
    }
  }

  const processed = await database
    .from("provider_webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", registered.data.id);
  if (processed.error)
    return Response.json(
      { error: "Unable to finalize webhook delivery." },
      { status: 503 },
    );
  return Response.json({ received: true, replayed: false });
}
