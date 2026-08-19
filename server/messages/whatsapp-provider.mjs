export class WhatsAppProviderError extends Error {
  constructor(code, options = {}) {
    super(
      code === "configuration_missing"
        ? "WhatsApp is not configured."
        : "WhatsApp delivery failed.",
    );
    this.name = "WhatsAppProviderError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.resultUnknown = options.resultUnknown ?? false;
  }
}

export function readWhatsAppConfiguration(environment = process.env) {
  const configuration = {
    accessToken: environment.WHATSAPP_ACCESS_TOKEN?.trim() ?? "",
    phoneNumberId: environment.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "",
    graphVersion: environment.WHATSAPP_GRAPH_VERSION?.trim() ?? "",
  };
  if (
    !configuration.accessToken ||
    !/^\d+$/.test(configuration.phoneNumberId) ||
    !/^v\d+\.\d+$/.test(configuration.graphVersion)
  ) {
    throw new WhatsAppProviderError("configuration_missing");
  }
  return configuration;
}

export function whatsappConfigurationAvailable(environment = process.env) {
  try {
    readWhatsAppConfiguration(environment);
    return true;
  } catch {
    return false;
  }
}

export class WhatsAppProvider {
  constructor(configuration, fetchImplementation = fetch) {
    this.configuration = configuration;
    this.fetchImplementation = fetchImplementation;
  }

  async sendText(recipientE164, text) {
    let response;
    try {
      response = await this.fetchImplementation(
        `https://graph.facebook.com/${this.configuration.graphVersion}/${this.configuration.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.configuration.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipientE164.slice(1),
            type: "text",
            text: { preview_url: false, body: text },
          }),
        },
      );
    } catch {
      throw new WhatsAppProviderError("provider_result_unknown", {
        resultUnknown: true,
      });
    }
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      /* no provider body is logged */
    }
    if (!response.ok)
      throw new WhatsAppProviderError("provider_rejected", {
        retryable: response.status === 429 || response.status >= 500,
      });
    const providerMessageId = payload?.messages?.[0]?.id;
    if (typeof providerMessageId !== "string" || !providerMessageId)
      throw new WhatsAppProviderError("provider_response_invalid", {
        resultUnknown: true,
      });
    return { providerMessageId };
  }
}

export function createWhatsAppProvider(
  environment = process.env,
  fetchImplementation = fetch,
) {
  return new WhatsAppProvider(
    readWhatsAppConfiguration(environment),
    fetchImplementation,
  );
}
