import { tutors } from "../../lib/tutors";
import { saveTutorMessage } from "../../lib/tutorMessages";

const verifySignature = async (payload: string, signature: string | null) => {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true;
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = `sha256=${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("")}`;
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return mismatch === 0;
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const isSubscription = params.get("hub.mode") === "subscribe";
  const isVerified = params.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN;
  const challenge = params.get("hub.challenge") ?? "";
  return isSubscription && isVerified
    ? new Response(challenge, { status: 200 })
    : new Response("Verification failed", { status: 403 });
}

export async function POST(request: Request) {
  const rawPayload = await request.text();
  if (!(await verifySignature(rawPayload, request.headers.get("x-hub-signature-256")))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawPayload || "{}") as {
    entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ id?: string; from?: string; timestamp?: string; text?: { body?: string } }> } }> }>;
  };

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const inbound of change.value?.messages ?? []) {
        const tutor = tutors.find(item => item.whatsappNumber === inbound.from);
        const text = inbound.text?.body?.trim();
        if (!tutor || !text) continue;
        saveTutorMessage({
          id: inbound.id || `wa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          tutorId: tutor.id,
          tutorName: tutor.name,
          text,
          direction: "inbound",
          channel: "whatsapp",
          status: "received",
          createdAt: inbound.timestamp ? new Date(Number(inbound.timestamp) * 1000).toISOString() : new Date().toISOString(),
          whatsappMessageId: inbound.id
        });
      }
    }
  }

  return Response.json({ received: true });
}
