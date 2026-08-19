import assert from "node:assert/strict";
import test from "node:test";
import {
  meetLinkReleaseMinutes,
  meetingDetailsView,
  meetViewerAuthorized,
  retryDelaySeconds,
} from "../server/meet/policy.mjs";
import {
  GoogleMeetProvider,
  MeetProviderError,
  readGoogleMeetConfiguration,
} from "../server/meet/provider.mjs";
import { provisionerAuthorized } from "../server/meet/internal-auth.mjs";

const configuration = {
  clientId: "client",
  clientSecret: "secret",
  refreshToken: "refresh",
  organizer: "organizer@studacad.com",
};
const response = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("Meet links are released consistently and revoked with the booking", () => {
  const startsAt = "2026-08-22T14:00:00.000Z";
  const meeting = {
    status: "ready",
    meeting_uri: "https://meet.google.com/abc-defg-hij",
  };
  assert.deepEqual(
    meetingDetailsView({
      format: "online_1to1",
      bookingStatus: "confirmed",
      startsAt,
      meeting,
      isAdmin: false,
      now: new Date("2026-08-21T13:59:59Z"),
      releaseMinutes: 1440,
    }),
    { status: "scheduled", releasesAt: "2026-08-21T14:00:00.000Z" },
  );
  assert.deepEqual(
    meetingDetailsView({
      format: "online_1to1",
      bookingStatus: "confirmed",
      startsAt,
      meeting,
      isAdmin: false,
      now: new Date("2026-08-21T14:00:00Z"),
      releaseMinutes: 1440,
    }),
    { status: "ready", joinUrl: meeting.meeting_uri },
  );
  assert.deepEqual(
    meetingDetailsView({
      format: "online_1to1",
      bookingStatus: "cancelled_by_tutor",
      startsAt,
      meeting,
      isAdmin: true,
      now: new Date(),
      releaseMinutes: 1440,
    }),
    { status: "cancelled" },
  );
  assert.equal(
    meetingDetailsView({
      format: "student_place",
      bookingStatus: "confirmed",
      startsAt,
      meeting,
      isAdmin: true,
      now: new Date(),
      releaseMinutes: 1440,
    }),
    null,
  );
  assert.equal(
    meetLinkReleaseMinutes({ GOOGLE_MEET_LINK_RELEASE_MINUTES: "60" }),
    60,
  );
});

test("only booking participants, the tutor, and admins are authorized", () => {
  assert.equal(
    meetViewerAuthorized({
      viewerId: "learner",
      roles: ["learner"],
      tutorUserId: "tutor",
      participantActive: true,
    }),
    true,
  );
  assert.equal(
    meetViewerAuthorized({
      viewerId: "tutor",
      roles: ["tutor"],
      tutorUserId: "tutor",
      participantActive: false,
    }),
    true,
  );
  assert.equal(
    meetViewerAuthorized({
      viewerId: "support",
      roles: ["admin"],
      tutorUserId: "tutor",
      participantActive: false,
    }),
    true,
  );
  assert.equal(
    meetViewerAuthorized({
      viewerId: "stranger",
      roles: ["learner"],
      tutorUserId: "tutor",
      participantActive: false,
    }),
    false,
  );
});

test("Google OAuth tokens refresh and provider responses are validated", async () => {
  let tokenCalls = 0;
  const fetchMock = async (url) => {
    if (String(url).includes("oauth2")) {
      tokenCalls += 1;
      return response(200, {
        access_token: `token-${tokenCalls}`,
        expires_in: 3600,
      });
    }
    return response(200, {
      name: "spaces/test-space",
      meetingUri: "https://meet.google.com/abc-defg-hij",
    });
  };
  const provider = new GoogleMeetProvider(configuration, fetchMock);
  const now = Date.now();
  assert.equal(await provider.accessToken(now), "token-1");
  assert.equal(await provider.accessToken(now + 1000), "token-1");
  assert.equal(await provider.accessToken(now + 3_700_000), "token-2");
  assert.equal((await provider.createSpace()).spaceName, "spaces/test-space");
  assert.equal(tokenCalls, 2);
});

test("provider outages enter retry state while unknown results require support", async () => {
  const rejected = new GoogleMeetProvider(configuration, async (url) =>
    String(url).includes("oauth2")
      ? response(200, { access_token: "token", expires_in: 3600 })
      : response(503, {}),
  );
  await assert.rejects(
    rejected.createSpace(),
    (error) =>
      error instanceof MeetProviderError &&
      error.retryable &&
      error.code === "provider_rejected",
  );
  const unknown = new GoogleMeetProvider(configuration, async (url) => {
    if (String(url).includes("oauth2"))
      return response(200, { access_token: "token", expires_in: 3600 });
    throw new Error("network");
  });
  await assert.rejects(
    unknown.createSpace(),
    (error) =>
      error instanceof MeetProviderError &&
      error.resultUnknown &&
      !error.retryable,
  );
  assert.equal(retryDelaySeconds(1), 30);
  assert.equal(retryDelaySeconds(20), 3600);
});

test("missing provider configuration and invalid provisioner secrets fail closed", () => {
  assert.throws(
    () => readGoogleMeetConfiguration({}),
    (error) =>
      error instanceof MeetProviderError &&
      error.code === "configuration_missing",
  );
  const secret = "a".repeat(32);
  assert.equal(provisionerAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(provisionerAuthorized("Bearer wrong", secret), false);
  assert.equal(provisionerAuthorized(null, secret), false);
});
