# Verification Report

Date: 19 November 2026. Local Windows build, Node 24.21.0, Next.js 16.4.6. No Git revision exists yet: the supplied folder was research documents only and has not been committed or published.

## Automated Results

- `npm test`: **122 passed, nine files**.
- `npm run typecheck`: passed.
- `npm run build`: passed with no warnings after scoping runtime database paths and excluding runtime data/secrets from deployment tracing.
- VS Code diagnostics: none.
- SDK patch: pinned `@getalby/sdk` 9.0.0; patch reversed and reapplied successfully with `patch-package --error-on-fail`. Both ESM and CJS response handlers have regression coverage. A fresh-machine installation has not been performed.
- `npm audit --omit=dev`: three low-severity findings in bolt11/secp256k1/elliptic; no moderate, high, or critical findings. Audit exits nonzero for these known advisories. No unsafe forced downgrade applied.

| Test slice | Passing tests | Boundary |
| --- | ---: | --- |
| Backend | 21 | SQLite durability, accounts/sessions, ownership, signed customer actions, token/nonce expiry, receipts, idempotency, HTTP guards |
| Browser cryptography | 25 | Canonical hash, Ed25519, tampering, exact Nostr receipt-event binding |
| SDK response handling | 52 | Both module formats; malformed envelopes, wrong method, errors and cleanup; stubbed transport |
| Lightning adapter | 12 | Signed fixture invoices, exact amounts/networks/hashes/preimages, default expiry, pending holds, UNKNOWN reconciliation |
| Assistant | 4 | Local fallback, strict field whitelist, financial injection rejection, explicit cost opt-in |
| Origin handling | 2 | Next bind-address regression and configured-origin protection |
| Portable bundles | 2 | Database-independent signature/scope verification and issuer pin rejection |
| Evidence states | 2 | Completion is not settlement; an unverified SETTLED label is insufficient |
| Workflow guards | 2 | Rejected quotes cannot be invoiced or receipted as completed work; filters use completion timestamps |

All wallet-response fixtures and locally signed unit invoices are synthetic test inputs, not real payments, not funding instructions, and not accessible through a production simulation endpoint.

## Local Browser Journey

Exercised against the actual local HTTP API with request interception removed:

1. Registered a dedicated demo technician through the UI.
2. Created a 1,000-sat laptop repair quote with a random expiring customer QR/link.
3. Opened the customer page in another tab without a required customer account.
4. Recorded customer acceptance signed by its browser key.
5. Marked work complete from the worker account.
6. Recorded completion acknowledgement from the same customer signing session.
7. Confirmed payment remained `NOT_REQUESTED` throughout; invoice creation was disabled without a wallet.
8. Issued an immutable server-signed unpaid receipt.
9. Browser independently accepted its canonical SHA-256 commitment and Ed25519 signature; worker Nostr attachment correctly absent.
10. Opted the job into the public passport: one selected acknowledged record, zero verified payments; private title/description omitted.
11. Switched to French and checked mobile layout at 390x844; worker, customer and verifier had no horizontal overflow.
12. Disabled connectivity on the loaded worker page, created one local queued draft, reconnected, and observed one new QUOTED job and an empty queue. No payment state changed.
13. Ran the authenticated demo seed script twice; both runs returned the same two quoted/unpaid job IDs.
14. Ran the independent private-bundle verifier against the real browser-created receipt: scope, receipt signature and customer signatures passed; payment evidence correctly `NOT_CLAIMED`, worker signature `NOT_ATTACHED`, issuer `NOT_PINNED` without a separately supplied trust key.
15. Confirmed the clean assistant request returned `Local draft, no AI`, no financial fields, and preserved the entered amount.
16. Production workbench and receipt verifier reloaded without new runtime errors at 390, 768 and 1440 pixels; no horizontal overflow. Production responses include CSP, no-referrer and frame-denial headers.

The integrated browser reported `document.hidden=true`, causing Playwright pointer-stability timeouts on background tabs. The journey used a mixture of native clicks, keyboard activation and dispatched DOM clicks. This is not an independent physical-device/touch test. An earlier reused review page returned an AI-mode response before its test interception was cleared; that response is excluded from integration evidence.

## Explicit External Blockers

- **Genuine wallet settlements: 0.** No receiving NWC credential, funded external payer or installed Bitcoin/Lightning lab was supplied. SDK and adapter implementation are real, but invoice creation and settlement against a genuine wallet have not been demonstrated here.
- External NIP-07 worker signing and relay publication: implemented, not exercised without a compatible external signer. Cryptographic fixture tests do not establish relay availability.
- AI provider quality/billing: not validated. `AI_ENABLED=false` is the default; a key alone cannot enable calls. No paid-provider call is required for the demonstrated fallback.
- User interviews, adoption, public deployment, public GitHub publication, ZIP submission and presentation recording: not performed. Do not claim the official wallet demonstration gate is complete.

## Running Build

The local production process uses `npm run start -- --port 3100`. Use http://localhost:3100 on this computer. Another device needs a reachable HTTPS origin and matching `APP_ORIGIN`; its own localhost is not this server.

Mainnet remains disabled. Default configuration is REGTEST / NO REAL MONEY, not a connected regtest wallet. No fabricated balances, settled payments, customer identities or usage metrics are seeded.