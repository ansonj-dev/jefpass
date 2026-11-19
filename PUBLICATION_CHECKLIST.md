# Publication Checklist

Unchecked means a release gate, not necessarily missing implementation. [VERIFICATION.md](VERIFICATION.md) records 122 passing tests, typecheck, clean build and the local unpaid browser journey. No Git revision/publication exists yet. These local checks do not certify production readiness or genuine wallet settlement.

## Source And Secrets

- [ ] Confirm the intended repository is public and readable in a signed-out browser. No public repository or deployment is claimed yet.
- [ ] Review `git status --short`, staged diff, and full diff. Preserve unrelated collaborator changes; commit only reviewed files.
- [ ] Inspect [.gitignore](.gitignore): ignore `node_modules/`, `.next/`, local `data/`, SQLite/WAL/SHM files, backups, private proof exports, `data/key`, `data/issuer-private.pem`, `.env`, `.env.local`, and other secret files. Keep only the secret-free [.env.example](.env.example) template tracked. This task does not modify ignore rules.
- [ ] Verify ignored data is not already tracked with `git ls-files`; ignore rules alone do not untrack secrets. Inspect ZIP contents separately, not just Git tracking.
- [ ] Scan working tree, staged contents, history, screenshots, logs, video and artifacts for NWC URIs, tokens, capabilities, raw invoices/preimages, customer PII, passwords and provider keys. Use a secret scanner plus manual review; no scanner result alone guarantees cleanliness.
- [ ] If exposed, revoke credentials immediately and follow coordinated history-removal procedures. Never merely hide an exposed live secret in a later commit.
- [ ] Confirm existing MIT [LICENSE](LICENSE) attribution and third-party dependency/asset notices. The source is open-source licensed; that does not mean a public Git repository has been published. A private npm package flag does not negate the license.

## Local Verification

- [ ] Confirm Node 24 and built-in `node:sqlite` on a persistent single-instance host. Record exact versions and lockfile revision; no Docker/lab availability assumed.
- [ ] Reproduce installation on a clean machine with `npm ci`; confirm the pinned SDK 9.0.0 postinstall patch applies. The included patch and both module formats have been tested locally. Do not skip scripts.
- [ ] Recheck npm audit on the final tree. Reported baseline: 3 low bolt11/secp256k1/elliptic findings, no moderate/high/critical findings. Do not force a weaker-major downgrade just to suppress the report.
- [x] Exercise local EN/FR worker/customer/receipt views, unpaid journey and offline reconnection. Local production server: http://localhost:3100. Physical-device usability remains a separate release check.
- [x] Run `npm test`: 122 tests passed; wallet tests use labelled fixtures, not live payments.
- [x] Run `npm run typecheck`: passed.
- [x] Run `npm run build`: passed without warnings; runtime data/secrets excluded from tracing.
- [ ] Verify implemented authentication, cross-worker isolation, seven-day capability expiry, five-minute nonce replay protection, same-origin mutations, receipt tampering, and public-payload privacy. Customer signing keys must remain sessionStorage-scoped by job.id. Do not claim identity verification or customer key recovery.
- [ ] Verify browser canonical hash/Ed25519 checks against `/api/session` current issuer key. Do not call this independent wallet verification or managed historical key rotation. Public receipts contain IDs, scopeHash, amount, timestamps and payment hash/source/network, but no invoice/preimage. Private export authorization must protect invoice/preimage/customer evidence.
- [ ] Confirm `DB_PATH=./data/jefpass.sqlite` default and optional exactly-32-byte hex/base64 `APP_ENCRYPTION_KEY`. Without it, preserve generated `data/key`; preserve generated `data/issuer-private.pem` too. No receipt issuer environment variables are supported.
- [ ] Verify nonfinancial IndexedDB draft/creation sync with stable clientId and backend worker-scoped deduplication. Do not claim service-worker offline reload/PWA completion; the manifest is an install hint only. Photos are deferred and no upload endpoint exists.
- [ ] Exercise durable unknown reservation across restart, including creation timeout without a hash; verify no automatic invoice recreation.
- [ ] Verify exact BOLT11 signature/amount/network/expiry/hash and mandatory preimage checks, including rejected evidence.
- [ ] Test encrypted backup/restore with appropriate key versions on an isolated instance; no network side effects during restore.

## Wallet And Demo Evidence

- [ ] Fill [INTEGRATIONS.md](INTEGRATIONS.md) evidence register with SDK/patch, actual receive-only wallet methods, network and relay allowlist. `NWC_ALLOWED_RELAYS` must exactly match parsed target `URL.href`, including slash; empty fails closed. Use reviewed wallet-specific WSS URLs, not placeholder `wss://relay.wallet-provider.example/`. No separate private-address filter exists. Keep secrets private.
- [ ] Execute one genuine payment from a separate customer wallet and reconcile the same invoice with exact amount/hash and matching preimage. Current genuine-settlement count remains **0**; credentials and Docker/node wallet lab tools are unavailable.
- [ ] Mainnet must remain always disabled regardless of flags. Default regtest and supported testnet/signet must match wallet `getInfo`; label actual network evidence accurately.
- [ ] Preserve/document the accepted hold-invoice limitation: it stays `PENDING` after local expiry until wallet terminal evidence. Do not manufacture `EXPIRED`/`SETTLED` or replacement invoices to bypass a blocked operation.
- [x] Seed labelled unpaid quotes through the authenticated `npm run demo:seed` command; repeated seeding returned the same IDs. Never seed settlement or customer acknowledgement.
- [x] Require `AI_ENABLED=true` plus a server key before any paid-provider call. Local fallback was browser-tested; leave AI disabled for this demo.
- [ ] External NIP-07/relay publication is unexercised. If validated later, publish only kind 30078 canonical sorted `{commitment,receiptId}` and `tags: [["d", receiptId]]`. `NEXT_PUBLIC_NOSTR_RELAYS` is PUBLIC browser-visible configuration only; never include wallet secrets or full private proof data.
- [ ] Record a three-minute video without private QR/URL/credential/proof leakage. If payments remain blocked, state that rather than fabricate success.
- [ ] Map evidence to all five criteria in [PROJECT_BRIEF.md](PROJECT_BRIEF.md), with actual versus remaining work visible. Keep interviews at 0 until actually conducted and consented.

## Submission

- [x] Record actual results, absent Git revision, default network and blockers in [VERIFICATION.md](VERIFICATION.md).
- [ ] Verify organizer eligibility and current submission form. The research pack gives 20 November 2026 at 20:00 UTC; confirm the official deadline and requirements directly.
- [ ] Prepare public repo link, accessible video, concise pitch, and required ZIP; open each link signed out and inspect ZIP for ignored/private files.
- [ ] Claim deployment only if it exists and has been independently checked. A local URL, video, or public source repo is not a deployed service. Any future host must support persistent disk and one Node instance; do not imply serverless compatibility.
- [ ] Review final Git diff/status; no secret/data artifacts staged and no unexplained changes. A clean worktree is a release check, not a claim made by this docs task. Do not discard collaborator edits to obtain it.
