# Roadmap disposition

All implementation stages exist as an ordered stacked draft-PR chain. They are not considered released or closed until reviewed, green, and merged in order.

| Order | Issue                                   | Draft PR | Disposition                                                               |
| ----- | --------------------------------------- | -------- | ------------------------------------------------------------------------- |
| 1     | #14 P0-01 runtime/environments          | #30      | Implemented; review/merge pending                                         |
| 2     | #15 P0-02 database/storage              | #31      | Implemented; review/merge pending                                         |
| 3     | #16 P0-03 auth/accounts                 | #32      | Implemented; review/merge pending                                         |
| 4     | #17 P0-04 tutor onboarding              | #33      | Implemented; production scanner/provider evidence pending                 |
| 5     | #18 P0-05 credits/ledger                | #34      | Offline verified deposit implemented; payment gateway explicitly deferred |
| 6     | #19 P0-06 availability/booking          | #35      | Implemented; staging concurrency evidence pending                         |
| 7     | #20 P0-07 LMS/favourites/referrals      | #36      | Implemented; staging journey pending                                      |
| 8     | #21 P0-08 tests/security                | #37      | Implemented; candidate checks must remain green                           |
| 9     | #22 P1-09 Meet                          | #38      | Implemented fail-closed; Google account/staging evidence pending          |
| 10    | #23 P1-10 messaging/WhatsApp            | #39      | In-app implemented; WhatsApp account/staging evidence pending             |
| 11    | #24 P1-11 earnings/payouts              | #40      | Manual workflow implemented; staging/reconciliation evidence pending      |
| 12    | #25 P1-12 notifications                 | #41      | In-app/outbox implemented; email account/staging evidence pending         |
| 13    | #26 P1-13 legal/support                 | #42      | Implemented; qualified review attestations pending                        |
| 14    | #27 P2-14 demo removal                  | #43      | Implemented; review/merge pending                                         |
| 15    | #28 P2-15 SEO/accessibility/performance | #44      | Implemented; Search Console/field/staging evidence pending                |
| 16    | #29 P2-16 readiness gate                | #45      | Repository gate implemented; production-like evidence keeps launch NO-GO  |

There is no known critical/high software defect from the completed local suite. External launch blockers and unmerged code are recorded in `readiness-status.json`; they cannot be converted to pass without evidence and product-owner approval. Once the stack is merged and staging evidence passes, update issue checklists with evidence links, close each issue in order, and make the final go/no-go decision on the exact release candidate.
