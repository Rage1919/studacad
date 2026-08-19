import "server-only";
import { appendAuditEvent } from "../db/repositories/audit-events";
import { getDatabaseAdminClient } from "../db/client";
import type { BookingMeeting } from "../db/models";
import type { Viewer } from "../auth/viewer";
import { createGoogleMeetProvider, MeetProviderError } from "./provider.mjs";
import {
  meetLinkReleaseMinutes,
  meetingDetailsView,
  meetViewerAuthorized,
  retryDelaySeconds,
} from "./policy.mjs";

export class MeetingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "MeetingError";
  }
}

export async function meetingForViewer(viewer: Viewer, bookingId: string) {
  const database = getDatabaseAdminClient();
  const booking = await database
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (booking.error)
    throw new MeetingError("Unable to load meeting details.", 500);
  if (!booking.data) throw new MeetingError("Meeting not found.", 404);

  const [profile, participant, meeting] = await Promise.all([
    database
      .from("tutor_profiles")
      .select("*")
      .eq("id", booking.data.tutor_profile_id)
      .maybeSingle(),
    database
      .from("booking_participants")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("learner_user_id", viewer.id)
      .is("cancelled_at", null)
      .maybeSingle(),
    database
      .from("booking_meetings")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle(),
  ]);
  if (profile.error || participant.error || meeting.error)
    throw new MeetingError("Unable to load meeting details.", 500);
  const authorized = meetViewerAuthorized({
    viewerId: viewer.id,
    roles: viewer.roles,
    tutorUserId: profile.data?.tutor_user_id,
    participantActive: Boolean(participant.data),
  });
  if (!authorized) throw new MeetingError("Meeting not found.", 404);
  return meetingDetailsView({
    format: booking.data.format,
    bookingStatus: booking.data.status,
    startsAt: booking.data.starts_at,
    meeting: meeting.data,
    isAdmin: viewer.roles.includes("admin"),
    now: new Date(),
    releaseMinutes: meetLinkReleaseMinutes(process.env),
  });
}

async function claimMeeting(candidate: BookingMeeting) {
  const database = getDatabaseAdminClient();
  const claimed = await database
    .from("booking_meetings")
    .update({
      status: "provisioning",
      attempt_count: candidate.attempt_count + 1,
      last_error_code: null,
      next_retry_at: null,
    })
    .eq("booking_id", candidate.booking_id)
    .in("status", ["pending", "retry_required"])
    .select("*")
    .maybeSingle();
  if (claimed.error)
    throw new MeetingError("Unable to claim Meet provisioning work.", 500);
  return claimed.data;
}

export async function provisionPendingMeetings(limit = 5) {
  const provider = createGoogleMeetProvider(process.env);
  const database = getDatabaseAdminClient();
  const now = new Date().toISOString();
  const candidates = await database
    .from("booking_meetings")
    .select("*")
    .or(
      `status.eq.pending,and(status.eq.retry_required,next_retry_at.lte.${now})`,
    )
    .order("requested_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 20)));
  if (candidates.error)
    throw new MeetingError("Unable to load Meet provisioning work.", 500);

  const results = {
    ready: 0,
    retryRequired: 0,
    supportRequired: 0,
    skipped: 0,
  };
  for (const candidate of candidates.data) {
    const claimed = await claimMeeting(candidate);
    if (!claimed) {
      results.skipped += 1;
      continue;
    }
    try {
      const space = await provider.createSpace();
      const saved = await database
        .from("booking_meetings")
        .update({
          status: "ready",
          provider_space_name: space.spaceName,
          meeting_uri: space.meetingUri,
          provider_creator: space.organizer,
          provisioned_at: new Date().toISOString(),
          last_error_code: null,
        })
        .eq("booking_id", claimed.booking_id)
        .eq("status", "provisioning")
        .select("*")
        .maybeSingle();
      if (saved.error || !saved.data)
        throw new MeetingError(
          "Meet space was created but could not be recorded.",
          500,
        );
      await appendAuditEvent({
        action: "meeting.provisioned",
        entityType: "booking",
        entityId: claimed.booking_id,
        metadata: { provider: "google_meet", attempt: claimed.attempt_count },
      });
      results.ready += 1;
    } catch (error) {
      const providerError = error instanceof MeetProviderError ? error : null;
      const retryable = Boolean(providerError?.retryable);
      const status = retryable ? "retry_required" : "support_required";
      const nextRetryAt = retryable
        ? new Date(
            Date.now() + retryDelaySeconds(claimed.attempt_count) * 1000,
          ).toISOString()
        : null;
      await database
        .from("booking_meetings")
        .update({
          status,
          last_error_code: providerError?.code ?? "persistence_unknown",
          next_retry_at: nextRetryAt,
        })
        .eq("booking_id", claimed.booking_id)
        .eq("status", "provisioning");
      await appendAuditEvent({
        action: "meeting.provisioning_failed",
        entityType: "booking",
        entityId: claimed.booking_id,
        metadata: {
          provider: "google_meet",
          code: providerError?.code ?? "persistence_unknown",
          retryable,
        },
      });
      if (retryable) results.retryRequired += 1;
      else results.supportRequired += 1;
    }
  }
  return results;
}

export function meetingErrorResponse(error: unknown) {
  if (error instanceof MeetingError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  if (
    error instanceof MeetProviderError &&
    error.code === "configuration_missing"
  ) {
    return Response.json(
      { error: "Google Meet provisioning is not configured." },
      { status: 503 },
    );
  }
  throw error;
}
