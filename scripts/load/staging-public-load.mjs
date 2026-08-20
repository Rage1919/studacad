import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const acknowledgement = process.env.STUDACAD_LOAD_TEST_CONFIRM;
const rawBaseUrl = process.env.STUDACAD_LOAD_BASE_URL;
assert.equal(
  acknowledgement,
  "staging-only",
  "Set STUDACAD_LOAD_TEST_CONFIRM=staging-only.",
);
assert.ok(rawBaseUrl, "STUDACAD_LOAD_BASE_URL is required.");
const baseUrl = new URL(rawBaseUrl);
assert.equal(baseUrl.protocol, "https:", "Staging load tests require HTTPS.");
assert.notEqual(
  baseUrl.hostname,
  "studacad.com",
  "The load harness refuses the production domain.",
);

const capacity = JSON.parse(
  await readFile(
    new URL("../../config/release-capacity.json", import.meta.url),
    "utf8",
  ),
);
const paths = ["/api/health", "/api/tutors", "/", "/tutors"];
const timings = [];
let failed = 0;
let cursor = 0;

async function worker() {
  while (cursor < capacity.publicSearch.requests) {
    const index = cursor++;
    const startedAt = performance.now();
    try {
      const response = await fetch(
        new URL(paths[index % paths.length], baseUrl),
        {
          headers: { "User-Agent": "Studacad-Staging-Capacity-Check/1.0" },
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) failed += 1;
      await response.arrayBuffer();
    } catch {
      failed += 1;
    } finally {
      timings.push(performance.now() - startedAt);
    }
  }
}

await Promise.all(
  Array.from({ length: capacity.publicSearch.concurrency }, worker),
);
timings.sort((a, b) => a - b);
const p95 = timings[Math.max(0, Math.ceil(timings.length * 0.95) - 1)] ?? 0;
const errorRate = failed / Math.max(1, timings.length);
const result = {
  baseUrl: baseUrl.origin,
  requests: timings.length,
  failed,
  errorRate,
  p95Milliseconds: Math.round(p95),
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
assert.ok(
  errorRate <= capacity.publicSearch.maximumErrorRate,
  `Error rate ${errorRate} exceeds budget.`,
);
assert.ok(
  p95 <= capacity.publicSearch.p95Milliseconds,
  `p95 ${p95} ms exceeds budget.`,
);
