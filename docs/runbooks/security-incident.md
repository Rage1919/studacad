# Security incident response

## Priorities and ownership

The production operator is the incident commander until a named security owner takes over. Protect people and private data first, then prevent unauthorized credit movement, preserve evidence, restore safe service, and communicate accurately.

## Response sequence

1. Record the incident start time, reporter, affected environment, request IDs, release SHA, and suspected scope in a private incident record. Never paste secrets or raw personal data into tickets or chat.
2. Contain the path: disable the affected provider/feature, revoke exposed credentials, suspend compromised accounts, or block the vulnerable route. Prefer a feature kill switch or deployment rollback over ad-hoc database edits.
3. Preserve redacted logs, audit events, webhook identifiers/hashes, relevant ledger transaction IDs, and deployment metadata. Do not alter append-only ledger or audit records.
4. Rotate credentials in this order when applicable: hosting/deployment, database service role, authentication provider, payment/payout provider, messaging/Meet provider, storage signing credentials.
5. Determine affected users and data categories. For financial incidents, reconcile every impacted transaction and use compensating ledger entries; never rewrite history.
6. Patch and verify in staging with an authorization regression test. Obtain a second review for authentication, admin, private-file, or financial fixes before production.
7. Notify affected users and regulators when required by the applicable policy/law. State known facts, protective steps, and support contact; do not speculate.
8. Close only after monitoring confirms containment, credentials are rotated, recovery is verified, and follow-up owners/dates are recorded.

## Logging rules

Use the response `X-Request-Id` to correlate application and audit records. Logs must not contain authorization/cookie headers, tokens, passwords, email addresses, phone numbers, street addresses, message bodies, uploaded documents, webhook payloads, or provider secrets. Store only the minimum event identifiers and hashes needed for diagnosis.
