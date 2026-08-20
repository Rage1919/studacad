const DEPLOYED = new Set(["preview", "staging", "production"]);

const hex = (bytes) =>
  [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const sha256Hex = async (payload) =>
  hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload)));

export const verifyHmacSha256 = async ({
  payload,
  signature,
  secret,
  environmentName,
}) => {
  if (!secret) return !DEPLOYED.has(environmentName);
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = `sha256=${hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)))}`;
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1)
    mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return mismatch === 0;
};
