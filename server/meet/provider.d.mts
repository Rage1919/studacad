export class MeetProviderError extends Error {
  code: string;
  retryable: boolean;
  resultUnknown: boolean;
}
export type MeetConfiguration = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  organizer: string;
};
export function readGoogleMeetConfiguration(
  environment?: Record<string, string | undefined>,
): MeetConfiguration;
export class GoogleMeetProvider {
  constructor(
    configuration: MeetConfiguration,
    fetchImplementation?: typeof fetch,
  );
  accessToken(now?: number): Promise<string>;
  createSpace(): Promise<{
    spaceName: string;
    meetingUri: string;
    organizer: string;
  }>;
}
export function createGoogleMeetProvider(
  environment?: Record<string, string | undefined>,
  fetchImplementation?: typeof fetch,
): GoogleMeetProvider;
