# Observability, SLOs, and alert ownership

## Signals and privacy boundary

Every proxied response has `X-Request-Id`; authenticated mutations append the same request reference to immutable audit events where implemented. Security body/rate rejections and scheduled notification, message, Meet, and earning jobs emit one-line JSON with timestamp, severity, service, environment, release, event, request ID, duration, and bounded counters. Keys for credentials, sessions, contact details, addresses, messages, bodies, and payloads are redacted. Logs must never contain raw provider bodies, Meet links, tutor evidence, message content, payment destinations, email addresses, or full dynamic URLs.

`GET /api/health` is the public, uncached process/configuration probe. An uptime service calls `GET /api/internal/operations` with `Authorization: Bearer $OPERATIONS_HEALTH_SECRET`. The private probe checks database reachability, unbalanced ledger transactions, overdue/dead notification jobs, overdue/support-required message and Meet jobs, failed provider webhooks, failed payouts, and payout-clearing reconciliation. Unauthorized requests return 404; degraded state returns 503; output contains counts only.

The hosting log stream is the initial structured error-reporting sink. Before launch, retain searchable logs for at least 30 days, restrict access, test redaction, create saved views for `level=error`, `http.request_rejected`, `job.*.failed`, and `operations.snapshot*`, and configure a monitored export or alert rule. External monitoring is not currently provisioned, so this gate is not yet passed.

## Service objectives and alerts

| Capability               | Initial SLO                                                     | Page threshold                                                                 | Primary owner                 | Backup owner               |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- | -------------------------- |
| Public/API availability  | 99.5% successful eligible requests over 30 days                 | Two failed probes or 5-minute success below 99%                                | Technical operations owner    | Product owner              |
| Sign-in link request     | 99% accepted/provider-queued over 30 days; p95 ≤ 2 s            | Error rate > 2% for 5 minutes                                                  | Authentication owner          | Technical operations owner |
| Verified offline deposit | 100% balanced and idempotent                                    | Any unbalanced transaction, duplicate effect, or failed admin deposit          | Financial operations owner    | Product owner              |
| Booking                  | 99.5% valid attempts complete without server error; p95 ≤ 2 s   | Error rate > 2% for 5 minutes, overlap/duplicate debit count > 0               | Marketplace engineering owner | Technical operations owner |
| In-app messaging         | 99.5% valid sends persist; p95 ≤ 2 s                            | Error rate > 2% or oldest queued copy > 5 minutes                              | Messaging owner               | Support owner              |
| Meet provisioning        | 99% ready within 5 minutes of eligibility                       | Any support-required result or oldest eligible row > 5 minutes                 | Google Workspace owner        | Support owner              |
| Notifications            | 99% essential email handed to provider within 5 minutes         | Any dead letter or oldest due row > 5 minutes                                  | Notification owner            | Support owner              |
| Earnings/payouts         | 100% ledger reconciliation; scheduled release within 10 minutes | Any clearing mismatch, failed payout without case, or release lag > 10 minutes | Financial operations owner    | Product owner              |
| Webhooks                 | 99.9% valid events processed once                               | Any failed financial webhook or invalid-signature spike                        | Provider owner                | Security owner             |
| Database                 | 99.9% reachable; zero ledger imbalance                          | Private health 503, connection exhaustion, or any imbalance                    | Data-platform owner           | Technical operations owner |

SLO exclusions are limited to documented planned maintenance and verified invalid/abusive requests. Provider failures remain visible even when excluded from an application SLO. Do not silently remove an outage because a feature is externally hosted.

## Dashboard and paging checklist

Create one release dashboard with availability/error rate/latency by stable route template, sign-in outcomes, booking conflicts/server errors, message persistence and copy queue age, Meet queue age/status, notification queue age/dead letters, webhook failed/replay counts, payout states/clearing variance, database connection/latency, and deployed SHA. The alert title must carry environment, capability, threshold, and runbook link; the body carries request IDs and count only.

Before launch, replace role placeholders with reachable named people and provider escalation contacts, send one synthetic alert for every page rule, acknowledge from primary and backup paths, record timestamps, and attach evidence to the staging checklist. If no reachable primary and backup exist, the release remains NO-GO.
