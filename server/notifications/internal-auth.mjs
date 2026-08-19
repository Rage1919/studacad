import { timingSafeEqual } from "node:crypto";
export function notificationWorkerAuthorized(header, secret) {
  if (!secret || secret.length < 24 || !header?.startsWith("Bearer "))
    return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
