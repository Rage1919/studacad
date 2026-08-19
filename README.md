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
