# Publication and Submission Checklist

Use this checklist before any public release or hackathon submission. A checked item should have evidence.

## Repository and CI

- [x] Public GitHub repository exists.
- [x] MIT license is present.
- [x] Main branch contains source and documentation.
- [x] Dependencies are pinned to the lockfile versions.
- [x] GitHub Actions CI is configured for main and pull requests.
- [x] GitHub Actions passed 128 tests across 9 files, typecheck, production build and the configured dependency-audit gate on 19 November 2026.
- [x] The source-code follow-up commit `5e2d340c83d2412591ab9aea5457fc51f94d5a92` passed its GitHub Actions run.
- [x] Verification-report commit `b454dafdf602cfa4514f09796e3ac696059dcbca` passed CI: https://github.com/ansonj-dev/jefpass/actions/runs/44564741377.
- [ ] Confirm a fresh-machine npm ci installation and postinstall patch on a developer workstation.
- [ ] Review final commit history, screenshots, video and archive for secrets and customer data.

## Secrets and private data

- [ ] No NWC URI, seed phrase, private key, API key, session token, customer capability or private proof export is committed.
- [ ] No real customer phone numbers, email addresses or identifying notes are included.
- [ ] Confirm data/, SQLite, WAL/SHM, generated encryption key and issuer private key are ignored and not already tracked.
- [ ] Review ZIP contents separately from Git ignore rules.
- [ ] Revoke and rotate any secret accidentally exposed; deleting a later copy is not sufficient.

## Runtime and deployment

- [x] Node 24 is documented.
- [x] Single-instance persistent SQLite architecture is documented.
- [x] APP_ORIGIN is explicitly required in production and must use HTTPS.
- [ ] Configure a host with persistent disk and one active app instance.
- [ ] Preserve database, encryption key and issuer signing key together.
- [ ] Configure TLS, filesystem ACLs and encrypted backups.
- [ ] Perform an isolated backup/restore drill.
- [ ] Do not claim a deployment until the public URL is actually reachable and tested.

## Wallet and protocol evidence

- [x] NWC adapter is implemented with a receive-only method boundary.
- [x] Mainnet is disabled.
- [x] Invoice validation and payment-state tests are present.
- [x] Ambiguous invoice creation is not blindly retried.
- [ ] Provision a dedicated wallet connection scoped to get_info, make_invoice and lookup_invoice.
- [ ] Perform one genuine incoming payment from a separate test-network payer wallet.
- [ ] Reconcile the original invoice and verify exact amount, payment hash and preimage.
- [ ] Record a redacted evidence summary with network and wallet versions.
- [ ] Exercise external NIP-07 signing and public relay acknowledgement.
- [ ] Keep raw invoice, preimage and NWC URI out of public artifacts.

## Product and impact

- [x] Primary user and first workflow are documented.
- [ ] Conduct consented interviews with independent technicians.
- [ ] Validate whether customers will use the no-account confirmation flow.
- [ ] Test on physical low-cost Android devices and slow connections.
- [ ] Record only measured results; do not invent reach or adoption numbers.
- [ ] Check French copy with a fluent reviewer; add Wolof only with validated translations.

## Submission materials

- [x] README and architecture documentation.
- [x] Threat model, limitations and demo guide.
- [x] Final source commit `5e2d340c83d2412591ab9aea5457fc51f94d5a92` passed 128 tests, typecheck, production build and the configured dependency-audit gate; subsequent documentation commit also passed CI.
- [ ] Record an honest three-minute demo.
- [ ] Prepare concise slides and repository ZIP.
- [ ] Open all links in a signed-out browser.
- [ ] Inspect ZIP contents and public video for private data.
- [ ] Verify hackathon eligibility and submission form requirements with the organizer.
