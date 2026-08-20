const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SPACE_ENDPOINT = "https://meet.googleapis.com/v2/spaces";

export class MeetProviderError extends Error {
  constructor(code, options = {}) {
    super(
      code === "configuration_missing"
        ? "Google Meet is not configured."
        : "Google Meet provisioning failed.",
    );
    this.name = "MeetProviderError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.resultUnknown = options.resultUnknown ?? false;
  }
}

export function readGoogleMeetConfiguration(environment = process.env) {
  const configuration = {
    clientId: environment.GOOGLE_MEET_CLIENT_ID?.trim() ?? "",
    clientSecret: environment.GOOGLE_MEET_CLIENT_SECRET?.trim() ?? "",
    refreshToken: environment.GOOGLE_MEET_REFRESH_TOKEN?.trim() ?? "",
    organizer:
      environment.GOOGLE_MEET_ORGANIZER_EMAIL?.trim().toLowerCase() ?? "",
  };
  if (
    !configuration.clientId ||
    !configuration.clientSecret ||
    !configuration.refreshToken ||
    !configuration.organizer
  ) {
    throw new MeetProviderError("configuration_missing");
  }
  return configuration;
}

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export class GoogleMeetProvider {
  constructor(configuration, fetchImplementation = fetch) {
    this.configuration = configuration;
    this.fetchImplementation = fetchImplementation;
    this.cachedToken = null;
  }

  async accessToken(now = Date.now()) {
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000)
      return this.cachedToken.value;
    let response;
    try {
      response = await this.fetchImplementation(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.configuration.clientId,
          client_secret: this.configuration.clientSecret,
          refresh_token: this.configuration.refreshToken,
          grant_type: "refresh_token",
          scope: MEET_SCOPE,
        }),
      });
    } catch {
      throw new MeetProviderError("token_unavailable", { retryable: true });
    }
    const payload = await safeJson(response);
    if (!response.ok || typeof payload.access_token !== "string") {
      throw new MeetProviderError("token_rejected", {
        retryable: response.status >= 500,
      });
    }
    const expiresIn = Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 3600;
    this.cachedToken = {
      value: payload.access_token,
      expiresAt: now + Math.max(60, expiresIn) * 1000,
    };
    return this.cachedToken.value;
  }

  async createSpace() {
    const accessToken = await this.accessToken();
    let response;
    try {
      response = await this.fetchImplementation(SPACE_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
    } catch {
      throw new MeetProviderError("provider_result_unknown", {
        resultUnknown: true,
      });
    }
    const payload = await safeJson(response);
    if (!response.ok) {
      throw new MeetProviderError("provider_rejected", {
        retryable: response.status === 429 || response.status >= 500,
      });
    }
    if (
      typeof payload.name !== "string" ||
      !payload.name.startsWith("spaces/") ||
      typeof payload.meetingUri !== "string" ||
      !/^https:\/\/meet\.google\.com\/[a-z-]+$/.test(payload.meetingUri)
    ) {
      throw new MeetProviderError("provider_response_invalid", {
        resultUnknown: true,
      });
    }
    return {
      spaceName: payload.name,
      meetingUri: payload.meetingUri,
      organizer: this.configuration.organizer,
    };
  }
}

export function createGoogleMeetProvider(
  environment = process.env,
  fetchImplementation = fetch,
) {
  return new GoogleMeetProvider(
    readGoogleMeetConfiguration(environment),
    fetchImplementation,
  );
}
