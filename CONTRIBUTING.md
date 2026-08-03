# Contributing

Thank you for helping improve Secure Personal Vault.

## Before opening a change

- Use a public issue for bugs and feature discussions that contain no sensitive
  information.
- Follow `SECURITY.md` for vulnerabilities.
- Keep pull requests focused and explain any user-visible or deployment impact.
- Add or update tests for authentication, encryption, authorization, migration,
  and recovery behavior when those areas change.

## Development setup

Requirements: Node.js 22+, pnpm, Supabase Auth, PostgreSQL, and S3-compatible
storage.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:push
pnpm db:rls
pnpm dev
```

Never commit `.env`, production secrets, database dumps, encrypted user data, or
recovery kits. Use test-only accounts and disposable storage.

## Required checks

Run these commands before submitting a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test:bootstrap
pnpm build
pnpm audit --prod --audit-level moderate
```

If a change affects Docker or database setup, also validate the Compose
configuration and test both the documented upgrade and rollback procedure in an
isolated environment.

## Code and documentation

- Follow the existing TypeScript, React, and formatting conventions.
- Treat client/server boundaries explicitly; never expose server-only secrets to a
  client module.
- Preserve the zero-knowledge model: plaintext vault data and unlocked keys must
  remain browser-local.
- Keep migrations backward-compatible and document operator actions in the
  changelog and database guide.
- Update README and self-hosting documentation when behavior or configuration
  changes.

By contributing, you agree that your contribution is licensed under AGPL-3.0, the
project's existing license.
