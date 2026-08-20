export class WhatsAppProviderError extends Error {
  code: string;
  retryable: boolean;
  resultUnknown: boolean;
}
export type WhatsAppConfiguration = {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
};
export function readWhatsAppConfiguration(
  environment?: Record<string, string | undefined>,
): WhatsAppConfiguration;
export function whatsappConfigurationAvailable(
  environment?: Record<string, string | undefined>,
): boolean;
export class WhatsAppProvider {
  constructor(
    configuration: WhatsAppConfiguration,
    fetchImplementation?: typeof fetch,
  );
  sendText(
    recipientE164: string,
    text: string,
  ): Promise<{ providerMessageId: string }>;
}
export function createWhatsAppProvider(
  environment?: Record<string, string | undefined>,
  fetchImplementation?: typeof fetch,
): WhatsAppProvider;
