const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export class CsrfError extends Error {
  constructor(message = "Cross-site request rejected.") {
    super(message);
    this.name = "CsrfError";
  }
}

export function assertSameOrigin(request, configuredOrigin) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;

  const origin = request.headers.get("origin");
  if (!origin) throw new CsrfError();

  let requestOrigin;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    throw new CsrfError();
  }

  const allowed = new Set([requestOrigin, configuredOrigin].filter(Boolean));
  if (!allowed.has(origin)) throw new CsrfError();

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") throw new CsrfError();
}
