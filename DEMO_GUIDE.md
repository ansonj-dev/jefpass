# Demo Guide

## Readiness And Honest Baseline

Genuine wallet settlements: **0**. User interviews: **0**. No public deployment or GitHub publication completed. The unpaid workflow was exercised in the local browser; see the verification report. Without wallet credentials or a Lightning lab, demonstrate that workflow and disclose the settlement blocker. External NIP-07 signing/publication have not been exercised. Never fabricate settlement, preimages, testimonials or dashboard counts.

The unpaid job-to-receipt browser journey, offline reconnection, 122 automated tests, typecheck and production build passed; see [VERIFICATION.md](VERIFICATION.md). The local production server is http://localhost:3100. For fresh development use `npm ci`, then `npm run dev -- --port 3100`; for production use `npm run build` then `npm run start -- --port 3100`. Stop the running server before rebuilding. The required SDK postinstall patch is included.

For a genuine payment recording, separately provision a receiving NWC test wallet and funded external payer on the same actual network. Configure reviewed exact WSS relay URLs in `NWC_ALLOWED_RELAYS` (including URL-normalized trailing slash); empty fails closed. `regtest` is default; `testnet`/`signet` require matching wallet `getInfo`. Mainnet is always disabled regardless of flags. Leave `OPENAI_API_KEY` unset; no paid calls have been made. A separate device needs a reachable trusted HTTPS origin for browser signing, not its own localhost.

## Repeatable Sample Data

Create a dedicated demo worker account through the implemented UI. Create **DEMO SEED - laptop repair**, description "Inspect laptop charging fault; quote only", category Repair, quoted amount 100 sats (test-network demonstration only). Stop at `QUOTED` and `NOT_REQUESTED`: no customer acknowledgement, invoice, settlement, or receipt is pre-populated. Do not imply 100 sats is a researched local repair price or fiat conversion.

Alternatively, register a dedicated account, set `DEMO_EMAIL` and `DEMO_PASSWORD` privately in your terminal, and run `npm run demo:seed`. Optional `DEMO_ORIGIN` defaults to `http://localhost:3100`. The script uses authenticated APIs and the labelled fixtures; it does not write directly to SQLite. Running it twice returns the same two quoted-only jobs. Use a fresh job for the recorded journey. No customers, acknowledgements, payments, completed totals or interviews are seeded.

## Three-Minute Script

| Time | Action | Narration/evidence |
| --- | --- | --- |
| 0:00-0:25 | Show technician profile and visible test-network label | "A repair worker needs a portable record of agreement, receipt, and payment. We have not conducted user interviews yet." |
| 0:25-0:55 | Create a fresh repair quote; show exact scope/amount, EN/FR and customer QR off-record | "The customer can review this without an account. The private link expires after seven days." |
| 0:55-1:20 | Customer on a separate browser session accepts; worker completes; same customer session acknowledges; show dispute action without altering this journey | "Five-minute challenges are signed with a job-scoped browser key, not a verified identity. Service and payment are separate." |
| 1:20-2:05 | Reserve/create invoice; customer pays from external test wallet; lookup same hash | "This is [actual network], not mainnet money. Settlement requires exact invoice checks and a matching preimage." If blocked, say so and leave pending/unknown visible. |
| 2:05-2:35 | Issue receipt snapshot; show public browser hash/signature checks and authorized private export, with sensitive fields hidden | "The application issuer signs this snapshot, not the worker. Browser integrity checks trust this installation's current key; payment is a server claim, not an independent wallet query." |
| 2:35-3:00 | Show passport visibility and optional commitment controls; disclose external signer unavailable rather than claim publication | "Only a minimal commitment would go to relays. Offline is nonfinancial drafts/creation, not offline reload or payments. AI is optional and unset; photos are deferred. No fiat cash-out or repair-quality guarantee." |

With the current wallet blocker, use 1:20-2:05 to show the disconnected wallet state and explain the implemented reservation/reconciliation rules, without creating fictional wallet evidence. Continue by issuing an unpaid service receipt; it must say `NOT_REQUESTED`/`NOT_VERIFIED`, not `SETTLED`/`SHA256_MATCH`. A receipt does not require payment. Explain that accepted hold invoices stay `PENDING` after local expiry until the wallet supplies terminal evidence.

Do not expose customer capability URLs, NWC settings, private keys, raw invoice/preimage, password, or `.env.local` in video. Hide QR/URL when it contains a private capability or invoice; a recording can disclose it permanently. A local test-network payment is genuine only if actually executed; it is not evidence of customer adoption or mainnet use.

## Rehearsal Checks

- Verify EN/FR text, phone layout, customer-device connectivity, and clear service/payment statuses. Pending, expired, and unknown must not look paid.
- Test lost connectivity in an already loaded page: drafts and queued nonfinancial creation retain stable clientId values, and backend worker-scoped deduplication prevents duplicate creation. No service worker caches an app shell; do not promise offline reload. If payment lookup is interrupted, reconcile the original invoice/hash, not a replacement.
- Keep the customer's acceptance and acknowledgement in the same signing session: the secret is in sessionStorage keyed by job.id. Losing it cannot silently generate a new accepted identity. Link/nonce expiry or replay must not produce approval.
- Compare public receipt checks against a tampered copy. Private exports can be checked with `npm run verify:bundle -- path/to/private-export.json`; it checks offline cryptographic consistency, not a live wallet query. Keep private exports out of recordings and Git.
- If an external signer becomes available, kind 30078 content must be canonical sorted `{commitment,receiptId}` with `tags: [["d", receiptId]]`, not the full receipt. Until exercised, label publication unverified.
- Record revision, runtime, wallet/network, date, actual results, and blockers in final VERIFICATION.md. Only increment genuine-settlement count after the full external-wallet check; never count samples or fixtures.

## Safe Reset Of A Dedicated Demo Instance

Prefer a fresh dedicated account through the UI. There is no account-deletion workflow claimed here. Do not delete shared data to clear one account. Logging out is not deletion.

For a disposable local instance only, stop the app completely and confirm no other process has the database open. Back up any required records and matching key material securely, including unresolved operations; reconcile with the wallet first. Wallet invoices/relay events are not deleted by a local reset.

Before any manual deletion, the operator must explicitly confirm: **"I confirm this is the dedicated disposable JefPass demo instance; all accounts and records in its data directory may be lost, the app is stopped, and no unresolved payment needs this data."** If any part is uncertain, do not delete.

Only after that confirmation, manually remove the dedicated instance's configured `DB_PATH` (default `data/jefpass.sqlite`) and associated SQLite `-wal`/`-shm` files if present. This removes every account in that database, not just the demo account. Do not delete `data/key`, `data/issuer-private.pem`, unrelated folders, or keys to clear jobs, and never run an automatic destructive command. Keep protected matching backups if old receipts/connections matter. Clear only that demo origin's drafts/site data as needed; this can also lose customer sessionStorage signing keys. Revoke the old NWC delegation in the wallet. Generate a replacement share link to invalidate an earlier link while the instance is available; otherwise wait for its seven-day expiry and keep the old instance offline.

Restart and create a new account/sample through the UI after initialization is verified. No fake settled payments are restored or seeded.
