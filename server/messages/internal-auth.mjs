import { timingSafeEqual } from "node:crypto";
export function messageWorkerAuthorized(authorization, secret) {
  if (
    typeof authorization !== "string" ||
    typeof secret !== "string" ||
    secret.length < 32
  )
    return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
