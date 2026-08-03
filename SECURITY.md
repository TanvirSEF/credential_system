# Security policy

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue, discussion, or pull
request. Use [GitHub private vulnerability reporting](https://github.com/TanvirSEF/credential_system/security/advisories/new)
and include:

- the affected release or commit;
- a concise description of the impact;
- reproduction steps or a minimal proof of concept;
- any suggested mitigation; and
- whether the report has been shared elsewhere.

Do not include real credentials, recovery keys, database dumps, or decrypted user
data. Use a disposable local deployment for reproduction.

The maintainer will acknowledge a complete report as soon as practical, validate
the impact, coordinate a fix and disclosure, and credit the reporter when requested.
Please allow time for a patched release before publishing details.

## Supported versions

Security fixes are provided for the latest published release. Users should upgrade
to the newest release before requesting support.

## Security boundaries

Secure Personal Vault is designed so that vault payloads are encrypted in the
browser. Self-hosting operators are responsible for TLS, Supabase Auth, PostgreSQL,
S3 access controls, backups, server patching, and protecting deployment secrets.

The project has not undergone an independent security audit. Losing both the Master
Password and the current recovery key permanently removes the supported path to
decrypt the vault.
