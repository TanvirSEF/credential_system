# Changelog

All notable changes to Secure Personal Vault are documented here. The project uses
[Semantic Versioning](https://semver.org/).

## [1.2.1] - 2026-08-04

### Changed

- Upgraded Next.js to 16.2.12 and refreshed the production dependency lockfile.
- Rewrote the database setup and migration guide for the current PostgreSQL, RLS,
  and S3-compatible storage architecture.
- Expanded the README with the current security model, recovery limitations,
  feature set, and release-validation workflow.
- Added security reporting, contribution, and changelog documentation for the
  open-source project.

### Security

- Pinned patched `sharp` and `postcss` releases to remove known production
  dependency advisories.
- Verified that the production dependency audit reports no known vulnerabilities.

## [1.2.0] - 2026-08-04

### Added

- Master Password recovery with the current emergency recovery key.
- Recovery-kit download and verification during vault setup.
- Recovery-key rotation that revokes the previous recovery key.
- Security Health analysis with opt-in breached-password checks.
- Device-local automatic locking controls.
- Encrypted vault backup and restore.
- Secure notes, projects, Trash recovery, and password generation.

### Security

- Recovery and Master Password envelope updates use authenticated, conflict-aware
  server transactions.

## [1.1.0]

- Previous published release. See the corresponding GitHub Release for details.

## [1.0.0]

- Initial published release.
