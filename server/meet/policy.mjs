const ONLINE_FORMATS = new Set(["online_1to1", "online_group"]);

export function meetLinkReleaseMinutes(environment = process.env) {
  const parsed = Number.parseInt(
    environment.GOOGLE_MEET_LINK_RELEASE_MINUTES ?? "1440",
    10,
  );
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 10_080
    ? parsed
    : 1440;
}

export function meetViewerAuthorized(input) {
  return (
    input.roles.includes("admin") ||
    input.viewerId === input.tutorUserId ||
    input.participantActive === true
  );
}

export function meetingDetailsView(input) {
  if (!ONLINE_FORMATS.has(input.format)) return null;
  if (input.bookingStatus !== "confirmed") return { status: "cancelled" };
  if (!input.meeting) return { status: "preparing" };
  if (input.meeting.status === "revoked") return { status: "cancelled" };
  if (["retry_required", "support_required"].includes(input.meeting.status)) {
    return { status: "needs_support" };
  }
  if (input.meeting.status !== "ready" || !input.meeting.meeting_uri) {
    return { status: "preparing" };
  }

  const releaseAt =
    new Date(input.startsAt).getTime() - input.releaseMinutes * 60_000;
  if (!input.isAdmin && input.now.getTime() < releaseAt) {
    return {
      status: "scheduled",
      releasesAt: new Date(releaseAt).toISOString(),
    };
  }
  return { status: "ready", joinUrl: input.meeting.meeting_uri };
}

export function retryDelaySeconds(attemptCount) {
  return Math.min(3600, 30 * 2 ** Math.max(0, Math.min(attemptCount - 1, 7)));
}
