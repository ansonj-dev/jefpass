# Limitations

## Actual Versus Remaining

The full Next.js prototype is implemented, not just a scaffold. [VERIFICATION.md](VERIFICATION.md) records 122 passing tests, typecheck, clean production build, unpaid browser journey, independent export verification and offline reconnection. External wallet settlement remains blocked.

| Area | Actual evidence | Remaining gate |
| --- | --- | --- |
| Local app | Browser-tested account-to-customer-to-unpaid-receipt workflow | Capacity/restore tests, deployment hardening |
| Authentication/privacy | Salted scrypt, hashed sessions/capabilities, ownership/origin checks, encrypted NWC storage | External security review; managed secret rotation and recovery |
| Customer consent | Signed accept/acknowledge/dispute, five-minute nonces, seven-day links, job-scoped browser keys | Real usability/session-loss testing; not identity verification |
| Lightning | Receive-only NWC adapters, durable reservations, BOLT11 validation, lookup and mandatory preimage | Credentials/lab unavailable; 0 genuine wallet settlements |
| Receipt/Nostr | Canonical Ed25519 snapshots, private export, browser verification, optional minimal NIP-07 event path | External signer and relay publication unexercised; no independent public wallet query |
| Offline/EN/FR | Browser checked at 390px; one queued draft synchronized once | Physical-device/slow-network tests; no service-worker offline app shell |
| Optional AI | Authenticated strict-schema draft endpoint with local fallback, fixture tests | No paid calls; live model compatibility/quality not validated |
| Photos | Deferred | No upload endpoint or photo-storage workflow |
| Research/release | MIT-licensed source and project/judging documentation | No interviews, measured pilot, deployment, or public Git repository publication completed |

**Genuine wallet settlements: 0. User interviews: 0.** Wallet credentials and Bitcoin/Lightning lab tools are absent; Node itself is not a Lightning node. The local production server at localhost:3100 is not a public deployment. No external signer or relay publication is claimed. Unit fixtures and the unpaid browser journey do not remove these blockers.

## Technical Boundaries

- One persistent Node 24 instance and local SQLite file only. Not serverless, multi-region, multi-replica, highly available, or benchmarked.
- `DB_PATH` defaults to `./data/jefpass.sqlite`; optional `APP_ENCRYPTION_KEY` is exactly 32 bytes encoded as hex/base64. Otherwise a durable key is generated beside the database (default `data/key`). The issuer key is generated as `data/issuer-private.pem` with the default path; no receipt-key environment variables are supported. No historical issuer registry or managed key-rotation flow exists.
- The pinned SDK 9.0.0 postinstall patch is included, reapplication tested, and covered in both ESM/CJS. A fresh-machine installation is still a release check. Do not skip scripts.
- Reported npm audit: 3 low findings in bolt11/secp256k1/elliptic, no moderate/high/critical findings. Recheck final dependencies; do not force a downgrade to a weaker major to suppress the report. This is not an external security audit.
- `regtest` is the default; `signet`/`testnet` configuration requires exact wallet `getInfo` agreement. Mainnet is always disabled regardless of flags. Signet cannot be identified from a BOLT11 testnet prefix alone. No actual wallet/network combination is externally certified here.
- `NWC_ALLOWED_RELAYS` is a comma-separated exact allowlist matching parsed target `URL.href`, including slash; empty fails closed. WSS plus the operator allowlist are the controls, with no separate private-address/DNS filter. Placeholder `wss://relay.wallet-provider.example/` is not reachable; use the actual trusted wallet configuration. `NEXT_PUBLIC_NOSTR_RELAYS` must contain only safe PUBLIC relay URLs.
- NWC credential encryption is not full-database/disk encryption. Host operators and compromised server code remain trusted with decrypted credentials and issuer signing.
- Missing-hash `UNKNOWN` may require manual wallet/operator investigation and leave a job blocked. No safe automatic recreation is promised. Losing reservations in a reset/restore can lose this protection.
- An accepted hold invoice stays `PENDING` after local expiry until an authoritative wallet terminal response. This unresolved behavior can block wallet changes; settlement still requires the exact matching preimage.
- Offline means worker-scoped drafts and queued nonfinancial creation with stable clientId/backend scoped deduplication. No offline payment, financial queue, customer-signature queue, or guaranteed draft recovery across deletion/devices. The manifest is an install hint only: no service worker or guaranteed offline app-shell reload PWA.
- Customer keys live in sessionStorage keyed by job.id. Losing the original acceptance session can prevent later acknowledgement; there is no silent key replacement or customer key recovery.
- Optional photos are deferred and no upload endpoint exists. AI requires explicit `AI_ENABLED=true` and a server key; its local fallback works without provider credit. Live output quality, cost and provider compatibility remain unverified.

## Evidence Boundaries

Server Ed25519 issuer signature is not a worker's Nostr signature. Worker authorship is claimed only with a valid attached external NIP-07 event. Customer keys establish browser-key control, not verified people; the technician can fabricate an apparent customer. No cryptographic record certifies repair quality.

Public browser verification checks canonical SHA-256 and Ed25519 against the current installation key. It does not query a wallet, identify the payer or establish the issuer's claimed settlement time. Public `SHA256_MATCH` is a server-signed claim, not a public preimage check. The standalone private-bundle verifier checks exported scope/signatures and available invoice/preimage evidence; it does not query a live wallet. Verifiers need independently pinned issuer provenance. Historical key rotation is not implemented.

Public receipt metadata includes worker/job IDs, scope hash, amount, timestamps, payment hash/source/network, and verification label, but no raw invoice/preimage, private notes, capability, or NWC secret. Receipt-by-ID access remains public even when passport sharing is off. Nostr kind 30078 contains only canonical sorted `{commitment,receiptId}` and `tags: [["d", receiptId]]`, not the full receipt; there is no added commitment salt. Private disclosure and public metadata carry correlation risk. Relay events may persist indefinitely.

No escrow, refunds guarantee, exchange, fiat conversion/cash-out, mobile-money provider verification, autonomous spending, public rating, identity checks, or guaranteed credit access. Voice/Wolof support is not implemented. AI quality, installation behavior, accessibility, slow-network behavior, and production security are not certified. There is no independent security audit or measured adoption/reach.
