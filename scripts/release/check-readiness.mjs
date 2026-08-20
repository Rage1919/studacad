import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const statusPath = new URL(
  "../../docs/release/readiness-status.json",
  import.meta.url,
);
const status = JSON.parse(await readFile(statusPath, "utf8"));
const scope =
  process.argv
    .find((argument) => argument.startsWith("--scope="))
    ?.split("=")[1] ?? "repository";
const requiredGates = [
  "automated-suite",
  "staging-journeys",
  "observability-slos",
  "recovery-drills",
  "capacity-load",
  "security-privacy-review",
  "release-rollback",
  "roadmap-disposition",
];

assert.equal(status.schemaVersion, 1);
assert.ok(["GO", "NO_GO"].includes(status.decision));
assert.ok(status.decisionOwner);
assert.equal(
  new Set(status.gates.map((gate) => gate.id)).size,
  status.gates.length,
);
for (const gateId of requiredGates) {
  const gate = status.gates.find((candidate) => candidate.id === gateId);
  assert.ok(gate, `Missing readiness gate: ${gateId}`);
  assert.ok(
    gate.status && gate.owner && gate.evidence?.length,
    `Incomplete readiness gate: ${gateId}`,
  );
}
assert.equal(status.knownDefects.critical, 0);
assert.equal(status.knownDefects.high, 0);
for (const risk of status.launchRisks) {
  assert.ok(
    risk.id && risk.severity && risk.owner && risk.risk && risk.disposition,
    `Incomplete launch risk: ${risk.id ?? "unknown"}`,
  );
}

for (const document of [
  "../../docs/release/staging-readiness-checklist.md",
  "../../docs/operations/observability-and-slos.md",
  "../../docs/runbooks/recovery-and-provider-drills.md",
  "../../docs/release/launch-capacity-and-load-plan.md",
  "../../docs/release/final-security-privacy-review.md",
  "../../docs/release/go-live-and-rollback-plan.md",
  "../../docs/release/roadmap-disposition.md",
])
  await access(new URL(document, import.meta.url));

if (scope === "staging") {
  assert.equal(
    status.decision,
    "GO",
    `Staging gate is ${status.decision}: ${status.summary}`,
  );
  for (const gate of status.gates)
    assert.equal(gate.status, "passed", `${gate.id} is ${gate.status}`);
  assert.equal(
    status.launchRisks.filter((risk) => risk.severity === "launch-blocker")
      .length,
    0,
  );
} else assert.equal(scope, "repository", `Unknown readiness scope: ${scope}`);

process.stdout.write(
  `Readiness evidence contract is complete. Current decision: ${status.decision}; launch blockers: ${status.launchRisks.filter((risk) => risk.severity === "launch-blocker").length}.\n`,
);
