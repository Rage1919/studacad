# Initial launch capacity and load plan

The owner-authorized default is the conservative contract in `config/release-capacity.json`. It is a starting safety limit, not a traffic forecast. The public harness refuses `studacad.com`; set `STUDACAD_LOAD_TEST_CONFIRM=staging-only` and `STUDACAD_LOAD_BASE_URL` to the private HTTPS staging origin, then run `pnpm load:staging`.

## Required scenarios

| Scenario                    | Contract and invariant                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tutor search/public pages   | 50 concurrent clients, 500 requests, p95 ≤ 1 s, errors ≤ 1%; no private record or unbounded query                                                         |
| Slot calculation            | 25 concurrent clients, 250 requests, p95 ≤ 1.5 s, errors ≤ 1%; ordered timezone-correct slots and no duplicate private slot                               |
| Simultaneous booking/ledger | 10 eligible learners contend for one private slot; exactly one confirmation and one debit/hold; losers receive conflict with unchanged wallets; p95 ≤ 2 s |
| Webhook replay              | 500 signed test events with 50% duplicates; zero duplicate credit, payout, message, or notification effect                                                |
| Messaging                   | 20 users send 10 messages/minute; persistence errors ≤ 1%, isolation holds, provider copy may lag but oldest queue stays ≤ 5 minutes                      |
| Notification burst          | 1,000 mixed test events; source transactions remain fast, queue drains within five minutes, zero dead letters/duplicate sends                             |
| Meet/earnings workers       | Concurrent worker invocations claim each row once; safe retry and unknown-outcome rules hold; queue age stays inside SLO                                  |

The public harness covers health, public tutor API, homepage, and marketplace response pressure. Database integration tests already exercise atomic bookings, ledger idempotency, slot overlap, webhooks, messages, notifications, Meet lifecycle, earnings, refunds, and payouts. Staging must add real HTTP sessions and test-provider accounts for every protected scenario; local in-memory results do not substitute for network/database/provider capacity evidence.

## Execution and evidence

Seed only synthetic `example.test` identities in staging. Warm the candidate, record database/hosting tiers and baseline, run one scenario at a time, then the agreed mixed profile. Capture raw tool output, p50/p95/p99, error/status distribution, database connections/CPU/latency, queue age, dead letters, private operations snapshot, and ledger/reconciliation result. Stop immediately for tenant leakage, duplicate money effect, oversold private slot, unbounded retry, error rate above 5%, or database saturation.

Increase capacity only after a passing run and documented review. Reduce scheduler batch/concurrency or keep a feature closed when the platform cannot meet the contract. No public launch is approved until every scenario passes twice on the same production-like architecture.
