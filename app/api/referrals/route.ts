import { findTutor } from "../../lib/tutors";
import { listReferralRewards, recordReferralReward } from "../../lib/referralRewards";
import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";

const validCode = (value: string) => /^[A-Z0-9-]{6,32}$/.test(value);

export async function GET(request: Request) {
  try {
    await requireViewer();
    const referralCode = (new URL(request.url).searchParams.get("code") ?? "").trim().toUpperCase();
    if (!validCode(referralCode)) return Response.json({ rewards: [] });
    return Response.json({ rewards: listReferralRewards(referralCode) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    await requireViewer();
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    return authErrorResponse(error);
  }
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

