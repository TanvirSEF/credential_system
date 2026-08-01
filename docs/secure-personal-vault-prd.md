# Secure Personal Vault — Product Requirements Document (PRD)

> **Working title:** Secure Personal Vault  
> **Suggested stack:** Next.js App Router + TypeScript + Supabase Auth/Postgres/Storage + Web Crypto API + IndexedDB  
> **Document version:** 1.0  
> **Date:** 1 August 2026  
> **Status:** Product and technical planning  
> **Primary audience:** Product team, frontend/backend engineers, security reviewer, QA engineer

---

## 1. Executive Summary

Secure Personal Vault হলো একটি privacy-first web application যেখানে ব্যবহারকারী password, API key, banking information, recovery code, personal note এবং গুরুত্বপূর্ণ document নিরাপদভাবে সংরক্ষণ করতে পারবে।

বর্তমানে অনেক ব্যবহারকারী Telegram private channel, Google Sheet, browser note, email draft অথবা সাধারণ cloud drive-এ sensitive information রেখে দেয়। এতে account ban, account takeover, accidental sharing, provider access, server breach, limited organization এবং data integrity risk থেকে যায়।

এই product-এর মূল লক্ষ্য শুধু database column encrypt করা নয়। বরং sensitive content **ব্যবহারকারীর browser/device-এ encrypt করে তারপর Supabase-এ পাঠানো**। Supabase database ও storage-এ কেবল encrypted ciphertext থাকবে। Server ideally credential-এর plaintext value দেখতে পারবে না।

### Core product promise

- ব্যবহারকারী নিজের credential type নিজে তৈরি করতে পারবে।
- Password, secret note ও document এক জায়গায় সংগঠিত থাকবে।
- Sensitive payload client-side encrypted থাকবে।
- Supabase Auth identity ও database ownership নিশ্চিত করবে।
- PostgreSQL Row Level Security প্রতিটি user-এর data আলাদা রাখবে।
- IndexedDB encrypted local cache cold start এবং limited offline use উন্নত করবে।
- Master password server-এ পাঠানো বা সংরক্ষণ করা হবে না।
- Recovery key ছাড়া master password ভুলে গেলে encrypted data recover করা সম্ভব নাও হতে পারে—এই limitation product-এ স্পষ্টভাবে জানানো হবে।

> [!IMPORTANT]
> এটি security-sensitive product। Production release-এর আগে independent security review, penetration testing এবং cryptographic implementation review প্রয়োজন। “Encrypted” শব্দ ব্যবহার করলেই কোনো application স্বয়ংক্রিয়ভাবে secure password manager হয়ে যায় না।

---

## 2. Problem Statement

### 2.1 Existing behavior

Target user সাধারণত নিচের জায়গাগুলোতে sensitive data রাখে:

- Telegram private channel
- Google Sheet
- Google Docs
- Notes application
- Browser saved password
- Email draft
- Unencrypted folder বা cloud drive
- নিজের কাছে পাঠানো Messenger/WhatsApp message

### 2.2 Main risks

#### Account availability risk

Provider account banned, locked বা phone number হারিয়ে গেলে user data access হারাতে পারে।

#### Account takeover risk

Telegram/Google/email account compromise হলে attacker এক জায়গা থেকেই অনেক sensitive credential পেয়ে যেতে পারে।

#### Provider/server risk

Service provider বা compromised backend plaintext data access করতে পারে, যদি content end-user device-এ encrypt করা না হয়।

#### Organization problem

Credential গুলো structure ছাড়া রাখা হয়। কোনটি hosting, কোনটি banking, কোনটি social media, কোনটি API key—তা খুঁজে পাওয়া কঠিন হয়।

#### Data integrity problem

একটি password কখন পরিবর্তন হয়েছে, duplicate entry আছে কি না, document corrupt হয়েছে কি না বা accidental edit হয়েছে কি না—তা বোঝা কঠিন।

#### Limited control

Custom fields, credential type, export, encrypted backup, trash, versioning, device control এবং auto-lock-এর মতো feature সাধারণ note/channel-এ থাকে না।

---

## 3. Product Vision

একটি scalable, secure এবং user-controlled personal vault তৈরি করা যেখানে:

1. User নিজের data structure define করতে পারবে।
2. Sensitive plaintext browser-এর বাইরে না যাওয়ার চেষ্টা করা হবে।
3. Database leak হলেও attacker সরাসরি credential value পড়তে পারবে না।
4. User দ্রুত search, filter, copy এবং organize করতে পারবে।
5. Multi-device sync করা যাবে।
6. Application architecture future team vault, secure sharing, mobile app এবং browser extension support করতে পারবে।

---

## 4. Goals

### 4.1 Product goals

- Personal credential ও document secureভাবে সংরক্ষণ করা।
- Dynamic hierarchical credential types support করা।
- Single data, key-value ও information format support করা।
- Fast unlock, search এবং credential access experience প্রদান করা।
- Encrypted multi-device sync করা।
- Safe export/import এবং recovery mechanism প্রদান করা।
- Security architecture portfolio-quality এবং production-oriented করা।

### 4.2 Engineering goals

- Next.js App Router ভিত্তিক maintainable frontend architecture।
- Supabase Auth, Postgres, Storage এবং RLS ব্যবহার।
- Client-side encryption boundary পরিষ্কার রাখা।
- Crypto operations UI thread থেকে Web Worker-এ সরানোর সুযোগ রাখা।
- Schema versioning এবং crypto versioning support করা।
- Cross-user access prevent করার জন্য automated RLS tests রাখা।
- Sensitive logs, analytics এবং error reports minimize করা।

### 4.3 Success metrics

MVP beta পর্যায়ে:

- 100% credential payload database-এ ciphertext হিসেবে সংরক্ষিত।
- 100% document private bucket-এ encrypted blob হিসেবে সংরক্ষিত।
- Cross-user database access test pass rate: 100%।
- Tampered ciphertext decrypt attempt: 100% failure।
- Warm-cache vault list load target: 1 second-এর মধ্যে।
- 1,000 credential local search target: 300 ms-এর মধ্যে, mid-range laptop-এ।
- Zero plaintext credential value application logs-এ।
- Critical security defect production release-এর আগে শূন্য।

---

## 5. Non-Goals for MVP

MVP-তে নিচের feature বাধ্যতামূলক নয়:

- Enterprise organization vault
- Public credential sharing
- Browser autofill extension
- Native Android/iOS application
- Automatic password changing
- Dark web monitoring
- Emergency family access
- Full collaborative editing
- Password breach lookup that uploads plaintext password
- Server-side full-text search over decrypted content
- AI assistant that can read vault plaintext
- Cryptocurrency wallet/private-key management certification
- Government compliance claim
- “Unhackable” বা absolute security claim

---

## 6. Target Users

### Persona A — Developer/Freelancer

সংরক্ষণ করবে:

- Client login
- Hosting credentials
- API keys
- SSH notes
- Database connection information
- Environment variable snippets
- Recovery codes
- Project documents

Needs:

- Project/type-based organization
- Fast copy
- Secret masking
- Tags
- Expiry reminder
- Document attachment
- Search
- Device control

### Persona B — General personal user

সংরক্ষণ করবে:

- Social media password
- Wi-Fi password
- Banking reference information
- Passport/NID scans
- Important notes
- Subscription information
- Recovery codes

Needs:

- Simple UI
- Secure unlock
- Backup
- Easy categories
- Mobile responsive experience

### Persona C — Small business owner

সংরক্ষণ করবে:

- Business tools
- Social media accounts
- Domain/hosting information
- Vendor portals
- License files
- Contracts

MVP-তে single-user vault থাকবে। Team sharing future phase।

---

## 7. Product Principles

### 7.1 Privacy by design

Sensitive content defaultভাবে encrypted থাকবে। Optional analytics কখনও credential title, field, value বা document name সংগ্রহ করবে না।

### 7.2 Least privilege

Browser শুধু authenticated user-এর নিজের rows ও storage objects access করতে পারবে। Service-role key browser bundle-এ থাকবে না।

### 7.3 Explicit security boundaries

- Supabase Auth account password = account login।
- Vault master password = vault decryption।
- Recovery key = master password হারালে vault key recover করার optional mechanism।
- Route lock = UX protection।
- RLS = server-side authorization boundary।
- Encryption = database/storage content confidentiality layer।

### 7.4 Secure defaults

- Private storage bucket
- Auto-lock enabled
- Clipboard clear enabled
- Secret values masked
- MFA recommendation
- No plaintext export by default
- No third-party script inside unlocked vault screens

### 7.5 Honest limitations

XSS, malicious browser extension, compromised device বা malicious JavaScript delivered by a compromised deployment user-এর unlocked plaintext capture করতে পারে। Product copy-তে এই reality লুকানো হবে না।

---

## 8. Scope Overview

### MVP / Phase 1

- Account registration/login
- Email verification
- Optional MFA readiness
- Vault initialization
- Master password unlock
- Recovery key setup
- Dynamic credential types
- Hierarchical type/category
- Credential CRUD
- Single, key-value ও information formats
- Client-side credential encryption
- Secret field masking/copy
- Search/filter/favorite
- Encrypted document upload/download
- Private Supabase Storage
- Encrypted IndexedDB cache
- Auto-lock
- Trash and restore
- Encrypted export/import
- Basic device/session visibility
- Minimal audit events
- Security settings
- Responsive dashboard

### Phase 2

- TOTP generator
- Password generator
- Password health report
- Exact-match blind index
- Credential history/version restore
- Resumable large encrypted uploads
- Offline write queue
- Trusted devices
- New-device email alert
- Emergency recovery improvements
- PWA installation
- WebAuthn/passkey account login
- Browser extension prototype

### Phase 3

- Team vault
- Secure item sharing
- Organization roles
- Admin console without plaintext access
- Mobile application
- Browser autofill
- Security key support
- Independently audited cryptographic package

---

## 9. User Stories

### Authentication

- As a user, I want to create an account so that my encrypted vault can sync across devices.
- As a user, I want to verify my email so that account recovery and security alerts work.
- As a user, I want MFA so that stolen account passwords alone are insufficient.
- As a user, I want to view and revoke active sessions.

### Vault setup

- As a new user, I want to create a master password that never leaves my browser.
- As a new user, I want a recovery key so that I can recover my vault if I forget the master password.
- As a user, I want clear warnings before skipping recovery setup.

### Credential management

- As a user, I want to create custom credential types.
- As a user, I want nested types such as `Development > Hosting > Client A`.
- As a user, I want flexible fields rather than a fixed username/password form.
- As a user, I want secret fields hidden until I reveal them.
- As a user, I want to copy a value without editing the item.
- As a user, I want tags, favorite, expiry date and notes.
- As a user, I want deleted items to remain in Trash temporarily.

### Document management

- As a user, I want to upload a document that is encrypted before upload.
- As a user, I want to download and decrypt it locally.
- As a user, I want file size/type validation.
- As a user, I want failed or corrupted uploads detected.

### Local cache and offline

- As a returning user, I want the vault to open quickly.
- As a user, I want encrypted cached data, not plaintext browser storage.
- As a user, I want the local cache cleared when I remove the device.

### Backup

- As a user, I want to export an encrypted backup.
- As a user, I want to import that backup with validation.
- As a user, I want a clear warning before generating a plaintext export.

---

## 10. Functional Requirements

## 10.1 Authentication and account

### Required

- Supabase Auth email/password registration
- Email verification
- Login/logout
- Forgot account password
- Session refresh
- Protected app routes
- Account deletion
- All-device sign-out capability
- Login rate-limiting strategy
- Generic authentication error messages where user enumeration is possible

### Recommended

- TOTP MFA
- Passkey/WebAuthn in later phase
- New-device notification
- Recent-authentication requirement before:
  - deleting account
  - disabling MFA
  - rotating recovery key
  - wiping vault
  - exporting plaintext

### Important distinction

Account password reset must not silently decrypt or replace the vault master password. Supabase account access ফিরে পেলেও master password/recovery key ছাড়া encrypted vault খুলবে না।

---

## 10.2 Vault initialization

First successful authenticated session-এ user-এর vault না থাকলে setup wizard দেখাবে।

### Setup steps

1. Product security explanation
2. Master password creation
3. Master password confirmation
4. Strength feedback
5. Recovery key generate
6. Recovery key download/copy confirmation
7. Optional test: recovery key-এর নির্দিষ্ট অংশ re-enter
8. Vault creation
9. Default credential types create
10. Dashboard open

### Master password rules

- Minimum length policy, e.g. 12 characters
- Long passphrase support
- Paste allowed
- Unicode normalization policy defined
- No arbitrary maximum that truncates silently
- Strength meter guidance
- Never log or send to analytics
- Never send to Next.js server/Supabase

### Default credential types

- Login
- Secure Note
- API Key
- Database
- Hosting
- Wi-Fi
- Banking Reference
- Identity Document
- Recovery Code
- Software License

User এগুলো edit/delete করতে পারবে, system-required type ছাড়া।

---

## 10.3 Vault lock and unlock

### Locked state

Locked হলে:

- Decrypted records memory থেকে remove করার চেষ্টা করা হবে।
- Vault key reference destroy করা হবে।
- Sensitive React state reset হবে।
- Decrypted document object URL revoke করা হবে।
- Clipboard clear attempt করা যেতে পারে।
- App vault routes lock screen দেখাবে।
- IndexedDB ciphertext থেকে যাবে, যদি user cache clear না করে।

### Unlock flow

1. User master password enters।
2. Browser stored salt এবং KDF parameters fetch করে।
3. Browser master password থেকে Key Encryption Key derive করে।
4. Encrypted vault key unwrap/decrypt করে।
5. Verification marker decrypt করে password correctness validate করে।
6. Vault key memory-তে non-exportable `CryptoKey` হিসেবে রাখা হবে, যেখানে সম্ভব।
7. Encrypted cache/server records fetch করে local decrypt করা হবে।

### Auto-lock triggers

- Configurable inactivity: 1, 5, 15, 30, 60 minutes
- Browser/tab close
- Explicit lock button
- Logout
- Device revoke
- Optional: tab background-এ দীর্ঘ সময়
- Optional: screen lock signal যেখানে browser support করে

Default: 15 minutes inactivity।

> Route protection alone security নয়। Attacker API call করলে RLS ownership enforce করবে; plaintext protection unlocked key-এর উপর নির্ভর করবে।

---

## 10.4 Credential type management

Credential type user-defined এবং hierarchical হবে।

### Type properties

- `id`
- encrypted name
- encrypted description
- encrypted icon reference or safe icon key
- `parent_type_id`
- sort order
- archived flag
- schema/template definition
- created/updated timestamps
- version

### Hierarchy examples

```text
Development
├── Hosting
│   ├── Personal
│   └── Client
├── Database
└── API Key

Personal
├── Social Media
├── Banking Reference
└── Documents
```

### Rules

- Circular parent relationship allowed নয়।
- Maximum nesting depth MVP-তে 5।
- Parent delete করলে child types:
  - move to root, অথবা
  - cascade archive—user choice required।
- Type template update existing items automatically mutate করবে না।
- Existing item edit-এর সময় new fields apply করার option থাকবে।

---

## 10.5 Universal credential data model

UI-তে তিনটি format থাকবে, কিন্তু encrypted payload-এর ভিতরে একটি versioned universal structure ব্যবহার করা হবে।

### Format A — Single data

একটি মূল secret/value।

Examples:

- Wi-Fi password
- License key
- Recovery code
- PIN reminder

### Format B — Key-Value

Multiple custom fields।

Examples:

- Username
- Password
- Host
- Port
- Database
- API URL
- Secret token

### Format C — Information

Structured non-login information।

Examples:

- Passport details
- Bank account reference
- Emergency information
- Subscription details
- Contract note

### Suggested decrypted payload

```json
{
  "schemaVersion": 1,
  "format": "key_value",
  "title": "Example Hosting",
  "subtitle": "Production server",
  "fields": [
    {
      "id": "field_uuid",
      "label": "Username",
      "type": "text",
      "value": "example-user",
      "secret": false,
      "required": false,
      "copyable": true
    },
    {
      "id": "field_uuid",
      "label": "Password",
      "type": "password",
      "value": "example-secret",
      "secret": true,
      "required": true,
      "copyable": true
    }
  ],
  "websiteUrls": ["https://example.com"],
  "notes": "Example note",
  "tags": ["hosting", "production"],
  "favorite": false,
  "expiresAt": null,
  "attachments": [],
  "customMetadata": {}
}
```

Database-এ এই JSON plaintext রাখা হবে না। JSON serialize করে encrypt করার পর ciphertext রাখা হবে।

### Supported field types

- Text
- Password/secret
- Multiline text
- Email
- URL
- Number
- Date
- Date-time
- Phone
- Boolean
- Select
- Multi-select
- OTP seed — Phase 2
- File reference
- JSON/code snippet
- SSH private key text — advanced warningসহ

---

## 10.6 Credential CRUD

### Create

- Type select
- Template fields load
- Custom field add/remove/reorder
- Required validation
- Client-side encryption
- Database insert
- Local cache update
- Audit event create

### Read

- List view-তে decrypted title/subtitle local memory-তে render
- Secret values masked
- Reveal action
- Copy action
- Last updated time
- Type breadcrumb
- Attachment list
- Expiry state

### Update

- Record decrypt
- Edit
- Entire payload re-encrypt with fresh nonce
- Increment version
- Optimistic concurrency check
- Cache replace
- Previous version future phase-এ retain

### Delete

Default delete = soft delete।

- Move to Trash
- Trash retention target: 30 days
- Restore
- Permanent delete requires confirmation
- Permanent delete:
  - database row delete
  - encrypted storage object delete
  - local cache delete
  - audit event
- Cryptographic deletion future option: destroy item key

### Duplicate

Credential duplicate করলে new record ID এবং new encryption nonce/key material ব্যবহার করতে হবে। Ciphertext copy করা যাবে না।

---

## 10.7 Search, filter and sort

End-to-end encrypted content-এর server-side search সীমিত।

### MVP search design

- User vault unlock করার পর items decrypt হবে।
- Search browser-এ memory/local index-এর উপর চলবে।
- Searchable fields:
  - title
  - subtitle
  - labels
  - tags
  - website host
  - non-secret field values, optional
- Secret password value defaultভাবে search করা হবে না।
- Search query server-এ পাঠানো হবে না।

### Filters

- Type
- Parent category
- Tag
- Favorite
- Expired/expiring
- Has attachment
- Updated date
- Trash status

### Sort

- Recently updated
- Recently created
- Alphabetical
- Custom order
- Expiry date

### Future blind index

Exact-match search-এর জন্য keyed HMAC blind index করা যেতে পারে। এটি metadata leakage ও key management complexity তৈরি করে, তাই security review ছাড়া MVP-তে করা হবে না।

---

## 10.8 Secret display and clipboard

### Display

- Secret field masked by default
- Press-and-hold বা explicit reveal
- Reveal auto-hide timer
- Screen reader behavior carefully designed
- Browser autocomplete disabled on vault forms where appropriate
- Sensitive value HTML attribute/DOM exposure minimize করা

### Copy

- User click-এ clipboard write
- Toast: “Copied”
- Optional clipboard clear after 30/60 seconds
- Clipboard clear guaranteed নয়—OS/browser limitation উল্লেখ করতে হবে
- Copy event audit করা যেতে পারে, কিন্তু copied value log করা যাবে না

---

## 10.9 Password generator — Recommended MVP or Phase 2

Options:

- Length
- Uppercase
- Lowercase
- Number
- Symbol
- Avoid ambiguous characters
- Memorable passphrase mode
- Cryptographically secure random generation
- Strength estimate
- Generated password automatically save না করা

`Math.random()` ব্যবহার করা যাবে না। Browser cryptographic random source ব্যবহার করতে হবে।

---

## 10.10 Document management

### Supported use cases

- PDF
- Image
- Text file
- Recovery code file
- Contract
- ID scan
- License file
- Configuration backup

### MVP restrictions

- Private bucket only
- Suggested maximum file size: 20 MB per file
- Allowed MIME/type validation
- Executable files default deny
- File extension ও MIME mismatch warning
- User storage quota
- Per-user upload rate limit
- Total storage usage display

### Upload flow

1. User file selects।
2. Browser file metadata validates।
3. Random file encryption key generate।
4. File browser-এ encrypt হয়।
5. File key vault key দিয়ে wrap/encrypt হয়।
6. Encrypted blob Supabase Storage private bucket-এ upload হয়।
7. Encrypted metadata database-এ insert হয়।
8. Ciphertext checksum ও upload status save হয়।
9. Credential attachment reference update হয়।

### Download flow

1. Ownership RLS validate।
2. Private encrypted object fetch।
3. File key vault key দিয়ে unwrap।
4. Browser encrypted file decrypt করে।
5. Integrity/authentication verify।
6. User download/open action পায়।
7. Temporary object URL কাজ শেষে revoke হয়।

### File encryption design

MVP small files-এর জন্য whole-file AES-GCM করা যেতে পারে। Larger files-এর জন্য chunked encryption দরকার।

Chunked design-এ:

- Per-file random key
- Unique nonce per chunk
- Chunk index AAD-তে bind
- Total chunk count bind
- Final manifest authenticated
- Resume state encrypted
- Corrupted/reordered chunk reject

কোনো অবস্থায় একই key-এর সঙ্গে AES-GCM nonce reuse করা যাবে না।

### Storage path

```text
vault-files/{user_id}/{document_id}/{version}.enc
```

Path sensitive title reveal করবে না।

### Metadata

Plaintext database metadata minimize করা হবে। Recommended plaintext:

- owner_id
- document_id
- storage_path
- ciphertext_size
- crypto_version
- upload status
- created_at
- updated_at

Encrypted metadata payload:

- original file name
- MIME type
- plaintext file size
- description
- tags
- wrapped file key
- nonce/manifest
- attachment relation details

---

## 10.11 Local encrypted cache with IndexedDB

### Purpose

- Cold start reduce
- Slow network-এ faster list
- Limited offline read
- Future offline create/update queue
- Large vault-এর repeated download reduce

### Security requirements

- IndexedDB-তে plaintext credential/document metadata রাখা যাবে না।
- Cache record server ciphertext-এর সমতুল্য encrypted form-এ থাকবে।
- Vault master password রাখা যাবে না।
- Raw vault key localStorage/sessionStorage-এ রাখা যাবে না।
- Unlock key active session memory-তে থাকবে।
- Cache namespace per user/per vault।
- Logout, account switch এবং device removal handling থাকবে।

### Suggested stores

```text
vault_meta
credential_ciphertexts
type_ciphertexts
document_metadata_ciphertexts
sync_state
pending_mutations
settings_ciphertexts
```

### Cache invalidation

- Each record has `version` and `updated_at`
- Server sync token বা max updated timestamp
- Tombstone for deletes
- Cache schema version
- Crypto version
- User can manually clear local data

### Offline MVP

MVP-তে:

- Previously synced records offline unlock/read করা যেতে পারে, যদি necessary key envelope locally available থাকে।
- New write offline mode optional।
- Document download offline only if encrypted blob cached।
- Account authentication session expired হলে offline access policy product decision হিসেবে স্পষ্ট করতে হবে।

Recommended initial policy: active authenticated session এবং local vault envelope থাকলে offline unlock; sensitive environments-এর জন্য “disable offline vault” setting।

---

## 10.12 Sync and conflict handling

### Basic sync

- Initial unlock-এর পর changed rows fetch
- Local record version compare
- Upsert ciphertext
- Deleted tombstones apply
- Cache sync timestamp update

### Optimistic concurrency

Each mutable record:

- `version` integer
- `updated_at`
- optional `updated_by_device_id`

Update request expected current version পাঠাবে। Version mismatch হলে:

- overwrite নয়
- conflict dialog
- local এবং remote copy duplicate হিসেবে রাখা
- user merge/select করতে পারবে

### Realtime

Supabase Realtime future enhancement হিসেবে change notification দিতে পারে। Notification শুধু “record changed” জানাবে; plaintext payload broadcast হবে না।

---

## 10.13 Trash, retention and deletion

### Trash

- Soft delete timestamp
- Default 30-day retention
- Restore
- Manual permanent delete
- Trash size indicator

### Account deletion

Flow:

1. Recent authentication
2. Master password/recovery confirmation, where possible
3. Export reminder
4. Typed confirmation
5. Storage objects delete
6. Vault rows delete
7. Auth account delete
8. Local IndexedDB clear
9. Session revoke

### Backup limitation

Database backup systems encrypted ciphertext retain করতে পারে। Product privacy policy-তে backup retention window document করতে হবে।

---

## 10.14 Encrypted export and import

### Default export

Custom encrypted container, e.g. `.spv` বা `.vaultx`।

Package:

```text
manifest.json
vault-envelope.json
credential-records.ndjson
type-records.ndjson
documents/
checksums.json
```

সব sensitive payload ciphertext থাকবে।

### Manifest fields

- Product format version
- Export timestamp
- Record counts
- Crypto algorithms/versions
- KDF parameters
- Checksums
- Optional document list with opaque IDs

### Plaintext export

Optional advanced action:

- CSV/JSON
- Strong warning
- Recent authentication
- Vault unlock
- User must explicitly choose
- Browser generates locally
- Never uploads plaintext export to server
- Temporary Blob URL revoke
- No auto cloud backup

### Import

- File format validation
- Checksum validation
- Crypto version compatibility
- Duplicate strategy:
  - skip
  - replace
  - create copy
- Transactional import where possible
- Partial document failure report

---

## 10.15 Recovery design

A “forgot master password” feature server থেকে plaintext recover করতে পারবে না, যদি architecture সত্যিকারের client-side encryption অনুসরণ করে।

### Recommended recovery-key flow

Vault setup-এ:

1. Random 256-bit recovery secret generate।
2. User-friendly encoded recovery key display/download।
3. Recovery secret থেকে recovery KEK derive।
4. Same vault key recovery KEK দিয়ে encrypt/wrap।
5. Server শুধু recovery-wrapped vault key, salt, nonce ও params সংরক্ষণ করে।
6. Raw recovery key user-এর কাছে থাকে।

Recovery time:

1. User account authentication completes।
2. Recovery key enters।
3. Browser recovery KEK derive করে।
4. Vault key unwrap করে।
5. User new master password sets।
6. Vault key new master-password-derived KEK দিয়ে re-wrap হয়।
7. New recovery key rotate করার option।

### Recovery key UX

- Show once
- Download text/PDF না করে plain text file বা printable recovery sheet optional
- Store separately warning
- Confirmation challenge
- Never send full recovery key through email
- Support team cannot recover it

### No recovery key case

User master password ও recovery key দুটোই হারালে:

- Existing encrypted vault cannot be decrypted।
- User “Reset vault” করতে পারবে।
- Reset vault old encrypted data permanently delete করবে।
- Account login recovery এবং vault data recovery আলাদা হবে।

---

## 10.16 Master password change

Master password change-এর সময় সমস্ত credentials re-encrypt করার দরকার নেই।

Flow:

1. Current master password verify
2. Current KEK derive
3. Vault key unwrap
4. New salt generate
5. New master password থেকে new KEK derive
6. Same vault key new KEK দিয়ে wrap
7. Old envelope replace
8. Existing item ciphertext unchanged

Benefits:

- Fast password change
- Large document vault re-encryption দরকার নেই
- Lower failure risk

Recovery key rotation আলাদাভাবে করা যাবে।

---

## 10.17 Audit events

Audit log privacy-preserving হবে।

### Events

- Account login
- Login failed threshold
- Vault initialized
- Vault unlocked — local-only বা minimal server event
- Master password changed
- Recovery key rotated
- Credential created/updated/deleted
- Document uploaded/deleted
- Export generated
- Session revoked
- Device added/removed
- Account deletion requested

### Never log

- Credential title
- Username
- Password
- Secret field
- Notes
- Document original name
- Master password
- Recovery key
- Encryption key
- Full plaintext search query
- Decrypted error payload

### IP/device data

Security alert-এর জন্য IP/device information ব্যবহার করলে retention, consent এবং privacy policy define করতে হবে।

---

## 11. Encryption Architecture

## 11.1 Recommended key hierarchy

```text
User Master Password
        │
        ├─ KDF + unique salt + parameters
        ▼
Key Encryption Key (KEK)
        │
        ├─ AES-GCM wraps/encrypts
        ▼
Random Vault Key (256-bit)
        │
        ├─ encrypts credential payloads
        ├─ wraps per-file keys
        ├─ encrypts type/template payloads
        └─ encrypts local cache metadata
```

Optional recovery:

```text
Random Recovery Secret
        │
        ├─ KDF
        ▼
Recovery KEK
        │
        └─ wraps same Vault Key
```

### Why random vault key?

Master password directly দিয়ে প্রতিটি record encrypt করলে password change expensive হয় এবং crypto migration কঠিন হয়। Random vault key ব্যবহার করলে only key envelope re-wrap করতে হয়।

---

## 11.2 Algorithms

Recommended initial design:

- Data encryption: AES-256-GCM
- Randomness: `crypto.getRandomValues()`
- Browser crypto: Web Crypto API
- Password KDF preferred: Argon2id through reviewed WASM library
- Fallback when justified: PBKDF2-HMAC-SHA-256 with reviewed iteration policy
- Hash/checksum: SHA-256 for ciphertext integrity diagnostics; AES-GCM authentication remains primary tamper detection
- Encoding: base64url or binary `bytea`, consistently defined

### AES-GCM requirements

- Fresh unique nonce/IV for every encryption under the same key
- Recommended 96-bit IV
- AAD binds:
  - record ID
  - owner ID
  - vault ID
  - schema version
  - record type
- Authentication failure returns generic corruption/wrong-key error
- Never attempt to display partial plaintext after failure

### KDF parameters

KDF parameters record-এর সঙ্গে versionedভাবে সংরক্ষণ করতে হবে:

```json
{
  "name": "argon2id",
  "version": 1,
  "salt": "base64url",
  "memoryKiB": 65536,
  "iterations": 3,
  "parallelism": 1
}
```

Exact production parameters target browsers/devices-এ benchmark এবং security review করে নির্ধারণ করতে হবে। Parameter migration supported থাকতে হবে।

---

## 11.3 Key storage rules

- Master password: memory only during derivation
- KEK: short-lived memory only
- Vault key: unlocked session memory; preferably non-extractable `CryptoKey`
- Raw vault key: database-এ নয়
- Wrapped vault key: database-এ
- Recovery key: server-এ plaintext নয়
- Supabase service-role key: server secret only
- Publishable/anon key: browser-এ allowed, কিন্তু RLS mandatory
- Environment variables prefixed `NEXT_PUBLIC_` sensitive secret-এর জন্য ব্যবহার করা যাবে না

---

## 11.4 Encryption envelope example

Database record:

```json
{
  "ciphertext": "base64url...",
  "iv": "base64url...",
  "algorithm": "AES-256-GCM",
  "crypto_version": 1,
  "schema_version": 1
}
```

AAD database-এ আলাদা store না করলেও deterministic fields থেকে reconstruct করতে হবে।

---

## 11.5 Verification marker

Master password সঠিক কি না দ্রুত বোঝার জন্য vault setup-এ একটি fixed random verification payload vault key দিয়ে encrypt করা হবে।

Example plaintext before encryption:

```json
{
  "purpose": "vault-key-verification",
  "vaultId": "uuid",
  "version": 1
}
```

Wrong password হলে vault key unwrap বা marker decrypt fail করবে।

---

## 11.6 Crypto migration

Every encrypted object must include:

- `crypto_version`
- `payload_schema_version`
- algorithm identifier
- KDF version যেখানে relevant

Migration strategy:

- Read old version
- Decrypt locally
- Re-encrypt with new version
- Atomic update
- Failure rollback
- Progress UI
- Backup recommendation

---

## 12. Threat Model

| Threat | Expected protection | Remaining limitation |
|---|---|---|
| Supabase database leak | Credential payload ciphertext | Metadata such as timestamps/row count may leak |
| Supabase Storage leak | Encrypted file blobs | File sizes/path pattern may leak |
| Another authenticated user | RLS ownership policies | Policy bug can break isolation |
| Stolen account password | Vault master password still required | Attacker may delete ciphertext unless additional protections exist |
| Stolen unlocked device | Auto-lock reduces exposure | Active unlocked session can expose data |
| Lost locked device | Encrypted IndexedDB cache | Weak master password may be brute-forced offline |
| Network attacker | HTTPS/TLS plus ciphertext | Compromised endpoint remains dangerous |
| XSS | CSP and strict code reduce risk | XSS while unlocked can steal plaintext/key |
| Malicious browser extension | Limited protection | Extension may read page/clipboard |
| Compromised deployment/server | Stored ciphertext protected | Malicious JS update can capture master password |
| Insider/operator | No plaintext payload access by design | Metadata and service operations remain visible |
| Ciphertext tampering | AES-GCM authentication failure | Availability attack still possible |
| Accidental deletion | Trash/export/backups | Permanent deletion may be irreversible |

### Security priorities

1. Prevent XSS
2. Correct cryptographic implementation
3. Correct RLS
4. Secure session handling
5. Safe recovery
6. Dependency integrity
7. Backup and availability
8. Honest user education

---

## 13. Supabase Architecture

## 13.1 Services

### Supabase Auth

- Identity
- Email verification
- Password reset
- MFA
- Session/JWT
- User ID for RLS

### Supabase Postgres

- Encrypted credential rows
- Encrypted type rows
- Key envelopes
- Document metadata
- Device/audit metadata
- Sync versions

### Supabase Storage

- Private encrypted document blobs
- Encrypted export files only if server-stored export is later added
- No public URLs

### Supabase Edge Functions

Use only where needed:

- Security notification email
- Account deletion orchestration
- Rate-limited privileged tasks
- Billing/webhook future phase
- Storage cleanup job
- Expired Trash cleanup
- New-device alert

Edge Function plaintext vault payload decrypt করবে না।

---

## 13.2 Proposed database schema

### `profiles`

```sql
id uuid primary key references auth.users(id) on delete cascade
display_name text null
avatar_path text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Display name/avatar sensitive হলে encrypt করা যেতে পারে। MVP-তে minimal profile রাখাই ভালো।

### `vaults`

```sql
id uuid primary key
owner_id uuid not null references auth.users(id) on delete cascade
name_ciphertext bytea not null
name_iv bytea not null
crypto_version integer not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Single-user MVP-তে one vault per user constraint থাকতে পারে।

### `vault_key_envelopes`

```sql
id uuid primary key
vault_id uuid not null references vaults(id) on delete cascade
owner_id uuid not null references auth.users(id) on delete cascade
envelope_type text not null check (envelope_type in ('master', 'recovery'))
wrapped_key bytea not null
iv bytea not null
salt bytea not null
kdf_name text not null
kdf_params jsonb not null
crypto_version integer not null
verification_ciphertext bytea null
verification_iv bytea null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

`kdf_params` secret নয়, তবে validated schema ব্যবহার করতে হবে।

### `credential_types`

```sql
id uuid primary key
vault_id uuid not null references vaults(id) on delete cascade
owner_id uuid not null references auth.users(id) on delete cascade
parent_id uuid null references credential_types(id)
payload_ciphertext bytea not null
iv bytea not null
crypto_version integer not null
schema_version integer not null
sort_order integer not null default 0
version integer not null default 1
archived_at timestamptz null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Type name, description, icon/template payload encrypted থাকবে।

### `credentials`

```sql
id uuid primary key
vault_id uuid not null references vaults(id) on delete cascade
owner_id uuid not null references auth.users(id) on delete cascade
type_id uuid null references credential_types(id)
payload_ciphertext bytea not null
iv bytea not null
crypto_version integer not null
schema_version integer not null
version integer not null default 1
deleted_at timestamptz null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `documents`

```sql
id uuid primary key
vault_id uuid not null references vaults(id) on delete cascade
owner_id uuid not null references auth.users(id) on delete cascade
credential_id uuid null references credentials(id) on delete set null
storage_path text not null
metadata_ciphertext bytea not null
metadata_iv bytea not null
ciphertext_sha256 text null
ciphertext_size bigint not null
crypto_version integer not null
version integer not null default 1
upload_status text not null
deleted_at timestamptz null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `devices`

```sql
id uuid primary key
owner_id uuid not null references auth.users(id) on delete cascade
device_name text null
device_fingerprint_hash text null
last_seen_at timestamptz not null default now()
created_at timestamptz not null default now()
revoked_at timestamptz null
```

Device fingerprint privacy risk বিবেচনা করে minimal রাখা হবে।

### `audit_events`

```sql
id bigint generated always as identity primary key
owner_id uuid not null references auth.users(id) on delete cascade
event_type text not null
target_kind text null
target_id uuid null
device_id uuid null
metadata jsonb not null default '{}'::jsonb
created_at timestamptz not null default now()
```

`metadata` allowlist-based এবং non-sensitive হবে।

### `sync_tombstones`

```sql
id bigint generated always as identity primary key
owner_id uuid not null references auth.users(id) on delete cascade
vault_id uuid not null references vaults(id) on delete cascade
entity_type text not null
entity_id uuid not null
deleted_at timestamptz not null default now()
```

---

## 13.3 RLS policy pattern

Every exposed table-এ RLS enable করতে হবে।

Example ownership policy:

```sql
alter table public.credentials enable row level security;

create policy "users can read own credentials"
on public.credentials
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "users can insert own credentials"
on public.credentials
for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.vaults v
    where v.id = vault_id
      and v.owner_id = (select auth.uid())
  )
);

create policy "users can update own credentials"
on public.credentials
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "users can delete own credentials"
on public.credentials
for delete
to authenticated
using ((select auth.uid()) = owner_id);
```

### RLS requirements

- Every public/exposed table has RLS
- Foreign ownership consistency check
- `owner_id` client-supplied হলেও policy verify করবে
- Views/functions security behavior review
- Security-definer functions minimal
- Service-role usage isolated
- Automated two-user negative tests

---

## 13.4 Storage RLS

Bucket: `vault-files`

- Public: false
- Path first segment = authenticated user ID
- Insert/select/update/delete only own folder
- Object metadata trust করা যাবে না
- Original filename path-এ রাখা যাবে না

Conceptual policy:

```sql
(storage.foldername(name))[1] = (select auth.uid()::text)
```

Database document row ownership এবং object path দুটোই validate করতে হবে।

---

## 14. Next.js Application Architecture

## 14.1 Rendering boundary

### Server Components

Suitable for:

- Public landing page
- Documentation
- Authenticated shell where no decrypted data is passed
- Static settings description
- Server-generated non-sensitive page metadata

### Client Components

Required for:

- Master password input
- Key derivation
- AES encryption/decryption
- Decrypted credential rendering
- IndexedDB access
- Clipboard actions
- Local search
- File encryption/decryption
- Vault lock state

Decrypted data Server Component props বা server logs-এ পাঠানো যাবে না।

### Route Handlers

Use for:

- Security notifications
- Server-only orchestration
- Account deletion request
- Signed/privileged operation if necessary
- Health checks
- Rate-limited APIs

Standard CRUD ideally direct Supabase client + RLS অথবা carefully designed server boundary দিয়ে করা যেতে পারে। Zero-knowledge architecture-এ server route ciphertext ছাড়া plaintext নেবে না।

---

## 14.2 Suggested project structure

```text
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── security/page.tsx
│   │   └── privacy/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (vault)/
│   │   ├── layout.tsx
│   │   ├── unlock/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── credentials/
│   │   ├── types/
│   │   ├── documents/
│   │   ├── trash/
│   │   └── settings/
│   └── api/
│       ├── account/delete/route.ts
│       └── security/notify/route.ts
├── components/
│   ├── ui/
│   ├── vault/
│   ├── credentials/
│   ├── documents/
│   └── security/
├── features/
│   ├── auth/
│   ├── vault/
│   ├── credentials/
│   ├── credential-types/
│   ├── documents/
│   ├── backup/
│   └── devices/
├── lib/
│   ├── crypto/
│   │   ├── aes-gcm.ts
│   │   ├── kdf.ts
│   │   ├── key-envelope.ts
│   │   ├── payload-codec.ts
│   │   ├── file-crypto.ts
│   │   └── crypto-version.ts
│   ├── supabase/
│   │   ├── browser.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── indexed-db/
│   ├── validation/
│   └── security/
├── workers/
│   ├── crypto.worker.ts
│   └── search.worker.ts
├── stores/
│   ├── vault-session-store.ts
│   └── sync-store.ts
├── types/
└── tests/
    ├── crypto/
    ├── rls/
    ├── integration/
    └── e2e/
```

---

## 14.3 State management

Vault key application-wide state-এ carelessভাবে রাখা যাবে না।

Recommended:

- Small dedicated vault session service
- Non-serializable `CryptoKey`
- No Redux devtools persistence for sensitive state
- No localStorage persistence
- React Query/SWR cache-এ plaintext sensitive values রাখা হলে cache clear on lock
- Prefer explicit decrypted-record lifecycle
- Production error serialization review

---

## 14.4 Web Worker

KDF, large payload encryption, search indexing এবং file chunk processing Web Worker-এ করা উচিত।

Benefits:

- UI freeze কম
- Crypto code isolated module
- Progress reporting
- Easier cancellation

Worker security boundary নয়; same origin compromise worker-ও affect করতে পারে।

---

## 15. UX and Screen Requirements

## 15.1 Public screens

- Landing page
- How security works
- Limitations
- Pricing, if future SaaS
- Privacy policy
- Terms
- Security contact/disclosure policy

## 15.2 Auth screens

- Register
- Verify email
- Login
- Forgot account password
- MFA challenge
- Session expired

## 15.3 Setup screens

- Welcome
- Master password
- Recovery key
- Default type selection
- Security preferences

## 15.4 Vault screens

### Dashboard

- Total credentials
- Favorite items
- Recently updated
- Expiring items
- Documents count/storage use
- Security recommendations
- Quick add

### Credentials list

- Search
- Type tree
- Filters
- Sort
- Grid/list
- Favorite
- Add credential

### Credential details

- Title
- Type breadcrumb
- Fields
- Reveal/copy
- Website open
- Notes
- Attachments
- Edit
- Move
- Duplicate
- Trash

### Credential editor

- Type/template
- Dynamic fields
- Secret toggle
- Reorder
- Validation
- Add attachment
- Save/cancel

### Types

- Tree view
- Create child
- Edit template
- Reorder
- Archive
- Move

### Documents

- Upload
- Progress
- Size
- Related credential
- Download/decrypt
- Delete

### Trash

- Restore
- Permanent delete
- Retention days

### Settings

- Profile
- Security
- Auto-lock
- Offline cache
- Master password
- Recovery key
- MFA
- Sessions/devices
- Export/import
- Delete account

---

## 16. Security Requirements

## 16.1 Web security

- Strict Content Security Policy
- HTTPS only
- HSTS
- Secure cookies
- CSRF review for cookie-authenticated custom endpoints
- Origin checks on sensitive Route Handlers
- `X-Content-Type-Options: nosniff`
- Referrer policy
- Frame-ancestors deny or controlled
- No unsafe HTML rendering
- Sanitize any rich text
- Avoid `dangerouslySetInnerHTML`
- Dependency lockfile and review
- Secret scanning
- Source map policy
- No third-party analytics/script on unlocked vault pages
- No ad scripts
- No chat widget with DOM access to vault pages

## 16.2 Session security

- Supabase SSR/session guidance follow
- Secure, HttpOnly cookie where architecture supports
- No JWT/refresh token in localStorage if avoidable
- Reauthentication for destructive actions
- Session revocation UI
- Device list
- Logout clears sensitive client state and IndexedDB according to selected policy

## 16.3 Input validation

- Zod or equivalent shared schema
- Ciphertext/IV size limits
- UUID validation
- KDF parameter allowlist
- File MIME/extension/size validation
- Rate limit upload/create endpoints
- No arbitrary object keys leading to prototype pollution
- JSON depth/field count limits
- URL protocol allowlist

## 16.4 XSS-specific defense

XSS password manager-এর জন্য critical কারণ unlocked plaintext browser-এ থাকে।

- Strong CSP with nonce/hash
- No inline arbitrary scripts
- Trusted Types where practical
- Avoid unreviewed UI packages
- Dependency update monitoring
- Escape all labels/notes
- Markdown rendering হলে strict sanitizer
- No remote JavaScript CDN in vault
- Sensitive components security tests
- Paste content treated as plain text by default

## 16.5 Abuse and availability

- Per-user rate limits
- Storage quotas
- Maximum credential size
- Maximum number of fields
- Maximum document count
- Background cleanup for abandoned uploads
- Database backups
- Restore drills
- Status page future

---

## 17. Privacy Requirements

- Collect minimum profile data
- Credential content never used for analytics
- Search query local only
- Error reports redact payloads
- Audit metadata allowlist
- Clear retention policy
- Account deletion workflow
- Data export
- Cookie disclosure
- Third-party processor list
- Optional telemetry opt-out
- Avoid collecting precise device fingerprint unless justified
- Privacy policy explains encrypted content versus visible metadata

### Metadata Supabase may still see

Even client-side encryption থাকলেও service may observe:

- User account/email
- Login timestamps
- IP/session metadata
- Number of records
- Ciphertext size
- Document object size
- Creation/update timestamps
- Storage paths with opaque IDs

Product should not market itself as hiding all metadata unless that is actually implemented।

---

## 18. Non-Functional Requirements

## 18.1 Performance

- Initial public page Core Web Vitals target
- Unlock progress indicator
- KDF target device benchmark
- Crypto in worker for large operations
- List virtualization after 500+ items
- Search debounce
- Incremental document encryption
- IndexedDB warm-cache load
- Avoid decrypting documents until requested

## 18.2 Scalability

Initial target per user:

- 10,000 credentials
- 500 custom types
- 5,000 tags
- 5 GB encrypted documents, plan-dependent
- Multiple devices
- Pagination of ciphertext rows
- Batched sync

## 18.3 Reliability

- Idempotent upload completion
- Orphan file cleanup
- Atomic metadata update
- Conflict handling
- Export validation
- Retry with backoff
- Clear corruption error
- Backup/restore test

## 18.4 Accessibility

- WCAG-oriented keyboard navigation
- Visible focus
- Labels for secret controls
- Screen-reader-safe reveal/copy
- Reduced motion
- Contrast
- No color-only status
- Mobile responsive

## 18.5 Browser support

Initial:

- Latest Chrome/Edge/Firefox/Safari
- Web Crypto required
- IndexedDB required
- Graceful unsupported browser screen
- Private browsing storage limitations warning

---

## 19. Validation and Error Handling

### User-facing errors

- Wrong master password
- Corrupted key envelope
- Unsupported crypto version
- Session expired
- RLS access denied
- Upload too large
- Upload interrupted
- Document integrity failure
- Sync conflict
- Storage quota exceeded
- Offline unavailable
- Recovery key invalid

### Error safety

Error message কখনও নিচের data include করবে না:

- plaintext payload
- master password
- recovery key
- decrypted file name
- full ciphertext
- authentication token
- service key

### Corruption handling

- Do not overwrite corrupted source automatically
- Preserve encrypted record
- Offer export of raw encrypted record for support/debug
- Provide retry
- Identify record by opaque ID
- Log only safe diagnostic code

---

## 20. Testing Strategy

## 20.1 Unit tests

- AES-GCM encrypt/decrypt round trip
- Wrong key failure
- Modified ciphertext failure
- Modified IV failure
- Modified AAD failure
- Nonce uniqueness checks
- Key wrap/unwrap
- KDF parameter parsing
- Payload schema migration
- Export/import checksum
- Type hierarchy cycle prevention

## 20.2 Cryptographic tests

- Known test vectors where available
- Cross-browser compatibility
- Unicode master password normalization
- Large payload
- Empty payload
- Crypto version migration
- Recovery flow
- Master password change
- Memory/lifecycle review

## 20.3 RLS tests

At least two users:

- User A cannot select User B rows
- User A cannot insert with User B owner ID
- User A cannot update/delete User B rows
- User A cannot attach document to User B credential
- User A cannot access User B storage folder
- Anonymous user cannot access vault data
- Revoked session access fails

## 20.4 Integration tests

- Signup → setup → add → lock → unlock
- Credential CRUD
- Type CRUD
- Document upload/download
- Trash/restore
- Export/import
- Account password reset without vault unlock
- Recovery-key reset
- Session revoke
- Cache clear

## 20.5 E2E tests

Playwright or equivalent:

- Desktop/mobile
- Offline mode
- Slow network
- Multi-tab lock synchronization
- Conflict simulation
- Upload cancellation
- Browser refresh while unlocked
- Logout cleanup

## 20.6 Security testing

- Dependency audit
- SAST
- Secret scanning
- CSP test
- XSS payload test
- IDOR/RLS test
- Rate-limit test
- File upload abuse test
- Penetration test
- Cryptographic design review
- Backup restore exercise

---

## 21. Observability

### Allowed metrics

- API latency
- Error code count
- Upload success rate
- Ciphertext byte volume
- Sync duration
- KDF duration bucket, without password details
- Browser compatibility
- Crash-free sessions

### Forbidden telemetry

- Credential title/value
- Document original filename
- Notes
- Master password length/content
- Recovery key
- Decrypted tags
- User search content
- Clipboard content

### Logging

Structured safe event IDs ব্যবহার করা হবে। Sensitive exception object blindly send করা যাবে না।

---

## 22. Deployment and Environments

### Environments

- Local
- Development Supabase project
- Staging Supabase project
- Production Supabase project

Data/key separation mandatory।

### Deployment

- Next.js on Vercel or equivalent
- Supabase managed services
- Environment secrets in platform secret manager
- Preview deployments production database access পাবে না
- Branch database/migration strategy
- Database migrations version controlled
- Storage policies version controlled where possible

### CI/CD gates

- Typecheck
- Lint
- Unit tests
- RLS tests
- Build
- Secret scan
- Dependency audit
- Migration validation
- E2E staging smoke test

---

## 23. Suggested Environment Variables

Browser-safe:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
```

Server-only:

```bash
SUPABASE_SECRET_KEY=
SECURITY_EMAIL_PROVIDER_KEY=
CRON_SECRET=
```

Rules:

- Server secret কখনও `NEXT_PUBLIC_` prefix পাবে না।
- `.env` commit করা যাবে না।
- Development এবং production secret আলাদা।
- Secret rotation procedure document করতে হবে।

---

## 24. API and Data Access Principles

### Direct client data access

Supabase client direct access ব্যবহার করলে:

- Only ciphertext sent
- RLS required
- Publishable key only
- Input validation client + database constraints
- Ownership policy tested

### Server routes

Server route ব্যবহার করলে:

- Authenticated request
- Origin/CSRF review
- No plaintext vault content
- Rate limit
- Safe logging
- Service key only when absolutely necessary
- Explicit authorization before bypassing RLS

### Never do

- Browser-এ service-role/secret key
- Master password API call
- Plaintext credential in server action
- Plaintext document upload
- Public storage bucket
- RLS disabled “temporarily” in production
- Sensitive data in URL/query string
- Credential payload in analytics event

---

## 25. Detailed Data Lifecycle

## 25.1 Create credential

```text
User input
  → client validation
  → JSON payload normalization
  → fresh IV generation
  → AES-GCM encryption using vault key + AAD
  → ciphertext sent to Supabase
  → RLS verifies owner
  → encrypted row stored
  → encrypted cache updated
  → plaintext editor state cleared
```

## 25.2 Read credential

```text
Authenticated request
  → RLS returns own ciphertext
  → vault must be unlocked
  → browser reconstructs AAD
  → AES-GCM decrypts
  → schema validates
  → UI renders
  → lock clears decrypted state
```

## 25.3 Upload document

```text
File selected
  → validate
  → random file key
  → encrypt locally
  → wrap file key with vault key
  → upload encrypted bytes
  → insert encrypted metadata
  → attach opaque document ID
```

## 25.4 Change master password

```text
Current password
  → derive old KEK
  → unwrap vault key
  → derive new KEK
  → re-wrap vault key
  → replace envelope
  → items unchanged
```

## 25.5 Delete account

```text
Recent authentication
  → confirmation
  → encrypted export option
  → delete storage
  → delete database rows
  → delete auth account
  → clear local cache
```

---

## 26. MVP Acceptance Criteria

### Authentication

- [ ] User can register, verify and login.
- [ ] User cannot access another user’s rows or files.
- [ ] Logout removes unlocked key and decrypted state.
- [ ] Account password reset does not unlock vault.

### Vault encryption

- [ ] Master password is never sent to server.
- [ ] Random vault key is generated.
- [ ] Database stores only wrapped vault key.
- [ ] Credential payload is ciphertext in database.
- [ ] Tampering causes decryption failure.
- [ ] Every encryption uses a fresh IV.

### Credential types

- [ ] User can create/edit/archive types.
- [ ] User can create nested types.
- [ ] Circular hierarchy is blocked.
- [ ] Type template supports dynamic fields.

### Credentials

- [ ] CRUD works.
- [ ] Single, key-value and information formats work.
- [ ] Secret fields are masked.
- [ ] Copy and reveal work.
- [ ] Search is local.
- [ ] Trash and restore work.

### Documents

- [ ] File encrypts before upload.
- [ ] Bucket is private.
- [ ] RLS isolates file path.
- [ ] Download decrypts locally.
- [ ] Modified encrypted file fails integrity validation.

### Cache

- [ ] IndexedDB contains no plaintext credential data.
- [ ] Warm cache improves load.
- [ ] Cache clears on explicit device data removal.
- [ ] Lock removes decrypted in-memory state.

### Backup/recovery

- [ ] Encrypted export works.
- [ ] Import validates format/checksum.
- [ ] Recovery key can re-wrap vault key.
- [ ] Lost master password without recovery key displays irreversible reset warning.

### Security

- [ ] CSP configured.
- [ ] No third-party script in vault area.
- [ ] Sensitive logs redacted.
- [ ] Service-role key absent from browser build.
- [ ] RLS automated tests pass.
- [ ] Security review completed before public production release.

---

## 27. MVP Delivery Plan

### Milestone 0 — Security design

- Threat model
- Key hierarchy
- Crypto package selection
- KDF benchmark
- Database schema
- RLS test harness
- Security UX wording

### Milestone 1 — Foundation

- Next.js project
- Supabase Auth
- Protected layout
- Database migrations
- Base RLS
- Design system
- CI/CD

### Milestone 2 — Vault crypto

- Setup wizard
- Key generation
- Master envelope
- Recovery envelope
- Lock/unlock
- Auto-lock
- Crypto unit tests

### Milestone 3 — Credential types

- Type tree
- Dynamic templates
- Hierarchy validation
- Encrypted type payload

### Milestone 4 — Credentials

- CRUD
- Dynamic form
- Reveal/copy
- Search/filter
- Favorite
- Trash

### Milestone 5 — Documents

- Browser encryption
- Private Storage
- Upload/download
- Integrity handling
- Quota UI

### Milestone 6 — Cache and sync

- IndexedDB
- Sync versions
- Tombstones
- Conflict handling
- Multi-tab lock

### Milestone 7 — Backup and settings

- Encrypted export/import
- Master password change
- Recovery rotation
- Devices/sessions
- Account deletion

### Milestone 8 — Hardening

- RLS test suite
- XSS/security review
- CSP
- Pen test
- Performance
- Accessibility
- Production checklist

---

## 28. Future Feature Ideas

### Security

- Passkey login
- Hardware security key
- TOTP generator
- Breach check using privacy-preserving k-anonymity
- Security dashboard
- Weak/reused password detection performed locally
- Clipboard policy
- Screenshot warning on supported mobile platform
- Signed application release verification

### Productivity

- Browser extension
- Autofill
- Import from Chrome/Bitwarden/1Password formats
- Template marketplace without sharing secrets
- QR code transfer over local connection
- Expiry reminders
- Domain/SSL expiry integration
- API key rotation reminder
- Custom icon/color

### Collaboration

- Public-key encrypted item sharing
- Team vault
- Role-based access
- Time-limited share
- One-time secret link
- Access revocation
- Shared item key rotation

Sharing feature cryptographically complex; independent design review ছাড়া implement করা উচিত নয়।

### Documents

- Chunked resumable upload
- Encrypted preview
- Local OCR, optional
- Local document indexing
- Version history
- Duplicate detection using privacy-aware design

---

## 29. Key Product Decisions Requiring Final Confirmation

Before implementation, team-কে নিচের decisions finalize করতে হবে:

1. App name and branding
2. MVP-তে Argon2id WASM library selection
3. KDF benchmark target
4. Offline unlock allowed কি না
5. Recovery key mandatory না optional
6. Maximum document size
7. Trash retention period
8. Plaintext export support থাকবে কি না
9. TOTP MFA MVP-তে থাকবে কি না
10. Credential title encrypted থাকবে কি না — recommendation: yes
11. File original name encrypted থাকবে কি না — recommendation: yes
12. One vault per user না multiple vault
13. Audit event retention
14. Free/paid storage quota
15. PWA support MVP-তে থাকবে কি না
16. Browser support baseline
17. Cryptographic library review owner
18. Security disclosure/contact process

---

## 30. Recommended MVP Product Decisions

A practical first release-এর জন্য:

- One personal vault per account
- Email/password + email verification
- TOTP MFA available
- Separate master password mandatory
- Recovery key strongly recommended and setup confirmation required
- All credential/type titles encrypted
- Original document filenames encrypted
- AES-256-GCM payload encryption
- Argon2id preferred KDF
- 20 MB file limit
- 30-day Trash
- Local search
- Encrypted IndexedDB cache
- Offline read disabled initially অথবা opt-in
- No public sharing
- No browser extension
- No AI access to vault
- No plaintext server logs
- Security review before public launch

---

## 31. Security Copy Examples

### Master password warning

> Your master password is used on this device to unlock your encrypted vault. It is not sent to our server. If you lose both your master password and recovery key, your vault data cannot be recovered.

### Recovery key warning

> Save this recovery key somewhere separate from this app. Anyone with access to your account and recovery key may be able to unlock your vault.

### Plaintext export warning

> This export will contain readable credentials. Create it only on a trusted device, store it securely, and delete it when you no longer need it.

### Document corruption

> This document could not be decrypted or its integrity check failed. The encrypted source has not been overwritten.

### Vault reset

> Resetting the vault permanently removes the existing encrypted data. This action cannot restore data protected by a lost master password.

---

## 32. References and Implementation Guidance

The product team should review the latest official documentation before implementation because frameworks and security recommendations change.

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase secure data guidance: https://supabase.com/docs/guides/database/secure-data
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Edge Function security: https://supabase.com/docs/guides/functions/auth
- Next.js App Router: https://nextjs.org/docs/app
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- MDN Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- MDN AES-GCM parameters: https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
- MDN IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- OWASP Cryptographic Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- OWASP Key Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP HTML5 Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html

---

## 33. Final Architecture Summary

```text
┌──────────────────────────────────────────────────────────────┐
│                    User's Trusted Browser                    │
│                                                              │
│  Master Password                                             │
│       │                                                      │
│       ▼                                                      │
│  KDF → KEK → unwrap Vault Key                                │
│                    │                                         │
│                    ├─ decrypt/encrypt credentials            │
│                    ├─ wrap per-file keys                     │
│                    ├─ decrypt local search data               │
│                    └─ encrypt IndexedDB cache                 │
│                                                              │
│  Plaintext should remain only in controlled client memory.   │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS: ciphertext only
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                          Supabase                            │
│                                                              │
│  Auth        → identity, session, MFA                        │
│  Postgres    → ciphertext + minimal metadata + RLS           │
│  Storage     → private encrypted document blobs              │
│  Edge Funcs  → privileged workflows, no vault decryption     │
└──────────────────────────────────────────────────────────────┘
```

এই architecture-এর মূল মূল্য হলো **database encryption at rest-এর উপর একমাত্র নির্ভর না করে client-side encryption, key hierarchy, RLS, recovery, local encrypted cache এবং honest threat model একসঙ্গে ব্যবহার করা**।
