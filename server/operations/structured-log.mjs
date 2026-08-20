import { redactLogValue } from "../security/http-policy.mjs";

const LEVELS = new Set(["info", "warn", "error"]);
const UUID = /[0-9a-f]{8}-[0-9a-f-]{27,}/gi;
const LONG_SEGMENT = /\/[^/]{25,}/g;

export const operationalRoute = (pathname) =>
  String(pathname || "/")
    .replace(UUID, ":id")
    .replace(LONG_SEGMENT, "/:value");

export function createOperationalLogRecord({
  level = "info",
  event,
  requestId = null,
  details = {},
  now = new Date(),
  environment = process.env.STUDACAD_ENV || "unknown",
  release = process.env.STUDACAD_RELEASE_SHA || null,
}) {
  return {
    timestamp: now.toISOString(),
    level: LEVELS.has(level) ? level : "info",
    service: "studacad",
    environment,
    release,
    event,
    requestId,
    details: redactLogValue(details),
  };
}

export function logOperationalEvent(input) {
  const record = createOperationalLogRecord(input);
  const output = JSON.stringify(record);
  if (record.level === "error") console.error(output);
  else if (record.level === "warn") console.warn(output);
  else console.info(output);
  return record;
}
