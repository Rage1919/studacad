# Studacad

Studacad is a Botswana tutor marketplace and exam-preparation application built with Next.js 16.3, React 19, and vinext.

## Local development

Requirements: Node.js 22 or newer and pnpm 10.

1. Copy `.env.example` to `.env.local`.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm env:check`.
4. Run `pnpm dev`.

Before opening a pull request, run `pnpm check`.

## Deployment model

The canonical server-capable deployment uses the existing OpenAI Sites project recorded in `.openai/hosting.json`. GitHub Pages is a static UI preview and deliberately excludes `app/api`; it is not the transactional application.

See:

- [Production runtime decision](docs/adr/0001-production-runtime.md)
- [Environment and secret ownership](docs/operations/environments.md)
- [Deploy and rollback runbook](docs/runbooks/deploy-and-rollback.md)

## Database and private storage

Studacad uses Supabase Postgres as its durable source of truth and a private Supabase Storage bucket for verification documents and protected learning resources. Copy `.env.example`, provide a non-production project, then run:

```bash
pnpm db:env:check
pnpm db:migrate
pnpm db:seed:development
```

The seed command is restricted to development and test. Production migrations are checksum-verified, serialized, and transactional. See [the data-platform decision](docs/adr/0002-data-platform.md) and [the database/storage runbook](docs/runbooks/database-and-storage.md).

## Accounts

Accounts use server-managed Supabase passwordless email sessions. Configure the permitted callback origins before testing sign-in. Google and Apple are intentionally absent until their providers are approved and configured. See [authentication and authorization](docs/security/authentication-and-authorization.md) for session policy, protected surfaces, threats, and the first-admin procedure.
