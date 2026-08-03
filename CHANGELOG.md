# Changelog

All notable changes to Secure Personal Vault are documented here. The project uses
[Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-08-04

### Added

- Master Password recovery with the current emergency recovery key.
- Recovery-kit download and verification during vault setup.
- Recovery-key rotation that revokes the previous recovery key.
- Security Health analysis with opt-in breached-password checks.
- Device-local automatic locking controls.
- Encrypted vault backup and restore.
- Secure notes, projects, Trash recovery, and password generation.

### Changed

- Expanded self-hosting and database migration documentation.
- Added security reporting and contribution policies.
- Updated Next.js to 16.2.12 and pinned audited transitive security fixes for
  `sharp` and `postcss`.

### Security

- Recovery and Master Password envelope updates use authenticated, conflict-aware
  server transactions.
- Production dependency audit contains no known moderate or high vulnerabilities
  at release validation time.

## [1.1.0]

- Previous published release. See the corresponding GitHub Release for details.

## [1.0.0]

- Initial published release.
