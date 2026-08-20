# Roadmap disposition

All 16 implementation stages passed their protected integration check and were merged into `main` in dependency order on 2026-08-20. Roadmap issues remain open only where their production-like staging or external evidence criteria are not yet satisfied.

| Order | Issue                                   | PR  | Disposition                                                             |
| ----- | --------------------------------------- | --- | ----------------------------------------------------------------------- |
| 1     | #14 P0-01 runtime/environments          | #30 | Merged; private Sites deployment and `studacad.com` TLS active          |
| 2     | #15 P0-02 database/storage              | #31 | Merged; production-like Supabase and restore evidence pending           |
| 3     | #16 P0-03 auth/accounts                 | #32 | Merged; production-like auth-provider journey evidence pending          |
| 4     | #17 P0-04 tutor onboarding              | #33 | Merged; production scanner/provider evidence pending                    |
| 5     | #18 P0-05 credits/ledger                | #34 | Merged; offline verified deposits retained; gateway explicitly deferred |
| 6     | #19 P0-06 availability/booking          | #35 | Merged; staging concurrency evidence pending                            |
| 7     | #20 P0-07 LMS/favourites/referrals      | #36 | Merged; staging journey evidence pending                                |
| 8     | #21 P0-08 tests/security                | #37 | Merged; integrated candidate checks green                               |
| 9     | #22 P1-09 Meet                          | #38 | Merged fail-closed; Google account/staging evidence pending             |
| 10    | #23 P1-10 messaging/WhatsApp            | #39 | Merged; WhatsApp account/staging evidence pending                       |
| 11    | #24 P1-11 earnings/payouts              | #40 | Merged; staging/reconciliation evidence pending                         |
| 12    | #25 P1-12 notifications                 | #41 | Merged; email account/staging evidence pending                          |
| 13    | #26 P1-13 legal/support                 | #42 | Merged; qualified review attestations pending                           |
| 14    | #27 P2-14 demo removal                  | #43 | Merged; production-like route/journey evidence pending                  |
| 15    | #28 P2-15 SEO/accessibility/performance | #44 | Merged; Search Console/field/staging evidence pending                   |
| 16    | #29 P2-16 readiness gate                | #45 | Merged; production-like evidence correctly keeps launch NO-GO           |

There is no known critical/high software defect from the completed local and integrated suites. The unmerged-code blocker is resolved. Remaining external launch blockers are recorded in `readiness-status.json`; they cannot be converted to pass without evidence and product-owner approval. Once production-like staging evidence passes, update issue checklists with evidence links, close each issue in order, and make the final go/no-go decision on the exact release candidate.
