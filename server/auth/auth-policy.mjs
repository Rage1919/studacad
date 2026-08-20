const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set(["learner", "tutor", "admin"]);

export function normalizeEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

export function safeReturnPath(value, fallback = "/account") {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  try {
    const parsed = new URL(path, "https://studacad.invalid");
    return parsed.origin === "https://studacad.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export function hasRequiredRole(actualRoles, requiredRoles) {
  if (!Array.isArray(actualRoles) || !Array.isArray(requiredRoles)) return false;
  return requiredRoles.some(role => ROLES.has(role) && actualRoles.includes(role));
}

export function verifiedAuthIdentity(authUser, providerError = null) {
  return !providerError
    && Boolean(authUser)
    && typeof authUser.email === "string"
    && authUser.email.length > 0
    && typeof authUser.email_confirmed_at === "string"
    && !Number.isNaN(Date.parse(authUser.email_confirmed_at));
}

export function accountAllowsSession(account) {
  return Boolean(account) && account.status === "active" && !account.deleted_at;
}

export const EMAIL_LINK_RESPONSE = Object.freeze({
  message: "If that email can be used, Studacad has sent a secure sign-in link. Check your inbox and spam folder."
});
