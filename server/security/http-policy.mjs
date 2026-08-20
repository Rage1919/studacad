const REQUEST_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;
const DEPLOYED = new Set(["preview", "staging", "production"]);
const SENSITIVE_KEY =
  /(authorization|cookie|password|secret|token|session|email|phone|address|message|body|payload)/i;

const limiterGlobal = globalThis;
const buckets = limiterGlobal.__studacadRateLimitBuckets ?? new Map();
limiterGlobal.__studacadRateLimitBuckets = buckets;

export const requestId = (incoming) =>
  REQUEST_ID.test(incoming ?? "") ? incoming : crypto.randomUUID();

export const bodyLimitFor = (pathname, contentType = "") => {
  if (
    /\/api\/tutor-applications\/[^/]+\/documents$/.test(pathname) &&
    contentType.toLowerCase().startsWith("multipart/form-data")
  )
    return 12 * 1024 * 1024;
  if (pathname === "/api/whatsapp") return 1024 * 1024;
  return 128 * 1024;
};

export const parseContentLength = (value) => {
  if (value === null || value === "") return null;
  if (!/^\d+$/.test(value)) return -1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : -1;
};

export const ratePolicyFor = (method, pathname) => {
  if (method === "POST" && pathname === "/api/auth/email")
    return { scope: "auth-email", limit: 5, windowMs: 15 * 60_000 };
  if (method === "POST" && pathname === "/api/whatsapp")
    return { scope: "whatsapp-webhook", limit: 300, windowMs: 60_000 };
  if (method === "POST" && pathname === "/api/messages")
    return { scope: "message-send", limit: 30, windowMs: 60_000 };
  if (
    method === "POST" &&
    /\/api\/tutor-applications\/[^/]+\/documents$/.test(pathname)
  )
    return { scope: "document-upload", limit: 10, windowMs: 60 * 60_000 };
  if (method === "POST" && pathname === "/api/admin/wallet/deposits")
    return { scope: "verified-deposit", limit: 20, windowMs: 60_000 };
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method))
    return { scope: `mutation:${pathname}`, limit: 120, windowMs: 60_000 };
  return { scope: `read:${pathname}`, limit: 600, windowMs: 60_000 };
};

export const consumeRateLimit = (key, policy, now = Date.now()) => {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + policy.windowMs };
    buckets.set(key, fresh);
    return {
      allowed: true,
      remaining: policy.limit - 1,
      resetAt: fresh.resetAt,
      retryAfterSeconds: 0,
    };
  }
  current.count += 1;
  const allowed = current.count <= policy.limit;
  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets)
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }
  return {
    allowed,
    remaining: Math.max(0, policy.limit - current.count),
    resetAt: current.resetAt,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
};

export const contentSecurityPolicy = ({ nonce, environmentName }) => {
  const isDev = environmentName === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://graph.facebook.com https://meet.googleapis.com",
    "frame-src https://www.youtube.com https://youtube.com https://meet.google.com",
    "media-src 'self' blob: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (DEPLOYED.has(environmentName))
    directives.push("upgrade-insecure-requests");
  return `${directives.join("; ")};`;
};

export const securityHeaders = ({ nonce, environmentName }) => {
  const headers = {
    "Content-Security-Policy": contentSecurityPolicy({
      nonce,
      environmentName,
    }),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  if (environmentName === "production")
    headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  return headers;
};

export const redactLogValue = (value, depth = 0) => {
  if (depth > 6) return "[TRUNCATED]";
  if (Array.isArray(value))
    return value.slice(0, 50).map((item) => redactLogValue(item, depth + 1));
  if (!value || typeof value !== "object")
    return typeof value === "string" && value.length > 500
      ? `${value.slice(0, 500)}…`
      : value;
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 100)
      .map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key)
          ? "[REDACTED]"
          : redactLogValue(item, depth + 1),
      ]),
  );
};

export const clientAddress = (headers) =>
  (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown"
  ).trim();
