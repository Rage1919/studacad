import { findTutor } from "../../lib/tutors";
import { listReferralRewards, recordReferralReward } from "../../lib/referralRewards";

const validCode = (value: string) => /^[A-Z0-9-]{6,32}$/.test(value);

export async function GET(request: Request) {
  const referralCode = (new URL(request.url).searchParams.get("code") ?? "").trim().toUpperCase();
  if (!validCode(referralCode)) return Response.json({ rewards: [] });
  return Response.json({ rewards: listReferralRewards(referralCode) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    referralCode?: string;
    visitorId?: string;
    trialBookingId?: string;
    tutorId?: string;
  } | null;
  const referralCode = body?.referralCode?.trim().toUpperCase() ?? "";
  const visitorId = body?.visitorId?.trim() ?? "";
  const trialBookingId = body?.trialBookingId?.trim() ?? "";
  const tutor = findTutor(body?.tutorId ?? "");

  if (!validCode(referralCode) || !visitorId || !trialBookingId || !tutor) {
    return Response.json({ error: "Valid referral and trial booking details are required" }, { status: 400 });
  }

  const result = recordReferralReward({
    referralCode,
    visitorId,
    trialBookingId,
    tutorId: tutor.id,
    tutorName: tutor.name
  });
  return Response.json(result, { status: result.created ? 201 : 200 });
}

