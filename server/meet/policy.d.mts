export type MeetingView =
  | null
  | { status: "cancelled" | "preparing" | "needs_support" }
  | { status: "scheduled"; releasesAt: string }
  | { status: "ready"; joinUrl: string };
export function meetLinkReleaseMinutes(
  environment?: Record<string, string | undefined>,
): number;
export function meetViewerAuthorized(input: {
  viewerId: string;
  roles: string[];
  tutorUserId: string | null | undefined;
  participantActive: boolean;
}): boolean;
export function meetingDetailsView(input: {
  format: string;
  bookingStatus: string;
  startsAt: string;
  meeting: null | { status: string; meeting_uri: string | null };
  isAdmin: boolean;
  now: Date;
  releaseMinutes: number;
}): MeetingView;
export function retryDelaySeconds(attemptCount: number): number;
