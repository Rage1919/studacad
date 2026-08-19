# Studacad environments and configuration ownership

## Environment contract

| Environment | Purpose | Access | Server features |
| --- | --- | --- | --- |
| `development` | Local feature development | Developer machine | Yes, using local/test services |
| `test` | Deterministic CI checks | CI only | Provider fakes/test accounts only |
| `preview` | GitHub Pages UI review | Public preview URL | No; `app/api` is removed before export |
| `staging` | Private production-like candidate | Project owner and approved reviewers | Yes |
| `production` | Canonical public service | Public after release approval | Yes |

Before public launch, the existing private Sites deployment acts as `staging`. At launch it becomes `production`; a future requirement for simultaneous long-lived staging and production must be resolved before post-launch changes are promoted.

## Required variables

| Name | Secret | Required | Owner | Purpose |
| --- | --- | --- | --- | --- |
| `STUDACAD_ENV` | No | Always | Deployment owner | Selects the validated environment contract |
| `STUDACAD_APP_URL` | No | Always | Deployment owner | Canonical absolute origin; HTTPS outside local/test |
| `STUDACAD_RELEASE_SHA` | No | Recommended | Deployment pipeline | Identifies the deployed commit |
| `STUDACAD_DEPLOYED_AT` | No | Recommended | Deployment pipeline | ISO-8601 deployment timestamp |

Each roadmap issue must add its variables to this table and to `.env.example`. Secrets must be created in the provider’s environment store, restricted to the minimum set of maintainers, rotated after suspected exposure or staff/contractor access changes, and never copied into issues, pull requests, screenshots, logs, or client-prefixed variables.

The repository owner is accountable for production access and may delegate day-to-day rotation to a named operator. Payment, identity, messaging, and database credentials require separate provider-side least-privilege accounts where supported.

## Local setup

1. Install Node.js 22 or newer and pnpm 10.
2. Copy `.env.example` to `.env.local`.
3. Keep `STUDACAD_ENV=development` and use local/test provider credentials only.
4. Run `pnpm env:check`, then `pnpm dev`.

## Fail-closed behavior

`instrumentation.ts` and the `start` script validate the contract when the Node.js server starts. Invalid or missing required values stop the runtime. `/api/health` repeats the validation and returns only the environment name and optional release metadata; it never returns secrets or connection details. Compilation is environment-neutral because Sites injects these values into the deployed runtime rather than the source-build process; CI runs `pnpm env:check` as a separate preflight.
