# Deploy and rollback Studacad

## Preconditions

- The target commit is pushed to GitHub and its `Validate, test, and build` check is green.
- Database migrations, feature flags, and provider changes have an owner and rollback/forward-fix plan.
- Runtime variables pass `pnpm env:check` for the target environment.
- The exact pushed commit—not an uncommitted workspace—is used to build and save the Sites version.

## Deploy

1. Record the target Git commit SHA.
2. Build the server artifact from that exact commit with the production runtime variables available.
3. Save a new version in the existing Sites project and confirm its recorded `commit_sha` matches the target.
4. Deploy only that saved version.
5. Wait for the deployment to reach a terminal success state.
6. Verify `/api/health` returns `200`, `status: "ok"`, the expected environment, and the expected release SHA.
7. Smoke-test the homepage and every server workflow changed by the release.
8. Record the version number, commit, operator, timestamp, and verification result in the release/PR.

## Roll back

1. Stop further deployments and identify the last known-good saved Sites version.
2. Confirm its recorded commit and schema compatibility.
3. Deploy the known-good saved version; never rebuild an old commit and assume the artifact is identical.
4. Verify `/api/health` and the affected user journey.
5. If an irreversible database migration is involved, execute its documented forward-fix/recovery plan instead of deploying incompatible application code.
6. Record the incident, user impact, rollback version, data actions, and follow-up owner.

## Emergency configuration failure

If startup or `/api/health` reports an invalid environment, do not bypass validation. Restore the missing/invalid provider variable, rotate it if exposure is possible, deploy/restart, and verify health before reopening access.
