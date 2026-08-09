import { findTutor } from "../../lib/tutors";
import { listTutorMessages, saveTutorMessage, TutorMessage } from "../../lib/tutorMessages";

const whatsappUrl = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

export async function GET(request: Request) {
  const tutorId = new URL(request.url).searchParams.get("tutorId") ?? undefined;
  return Response.json({ messages: listTutorMessages(tutorId) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { tutorId?: string; text?: string; clientMessageId?: string } | null;
  const tutor = findTutor(body?.tutorId ?? "");
  const text = body?.text?.trim() ?? "";

  if (!tutor || !text) return Response.json({ error: "A tutor and message are required" }, { status: 400 });

  const message: TutorMessage = {
    id: body?.clientMessageId || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tutorId: tutor.id,
    tutorName: tutor.name,
    text,
    direction: "outbound",
    channel: "whatsapp",
    status: "saved",
    createdAt: new Date().toISOString()
  };
  saveTutorMessage(message);

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = /^v\d+\.\d+$/.test(process.env.WHATSAPP_GRAPH_VERSION ?? "")
    ? process.env.WHATSAPP_GRAPH_VERSION!
    : "v23.0";

  if (!accessToken || !phoneNumberId) {
    return Response.json({
      message,
      delivery: "whatsapp_link",
      whatsappUrl: whatsappUrl(tutor.whatsappNumber, text),
      demo: true
    });
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: tutor.whatsappNumber,
      type: "text",
      text: { preview_url: false, body: text }
    })
  });

  const result = await response.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { message?: string } };
  if (!response.ok) {
    saveTutorMessage({ ...message, status: "failed" });
    return Response.json({
      message: { ...message, status: "failed" },
      delivery: "whatsapp_link",
      whatsappUrl: whatsappUrl(tutor.whatsappNumber, text),
      warning: result.error?.message ?? "WhatsApp Cloud API delivery failed"
    });
  }

  const sent = saveTutorMessage({
    ...message,
    status: "sent",
    whatsappMessageId: result.messages?.[0]?.id
  });
  return Response.json({ message: sent, delivery: "cloud_api", demo: false });
}
