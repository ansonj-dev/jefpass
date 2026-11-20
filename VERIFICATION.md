# JëfPass Verification Report

**Updated:** 20 November 2026  
**Repository:** https://github.com/ansonj-dev/jefpass  
**Verification environment:** GitHub Actions, Ubuntu runner, Node.js 24.22.2, npm 11.19.1  
**Code verification commit:** `5e2d340c83d2412591ab9aea5457fc51f94d5a92`  
**Workflow run:** https://github.com/ansonj-dev/jefpass/actions/runs/44564266385

## Automated CI result

**Historical application CI: PASSED. The Cloudflare D1 persistence refactor is a newer change and must pass its own workflow run before this report is considered current.**

GitHub Actions successfully completed all configured steps on 19 November 2026:

- `npm ci`: passed. The pinned `@getalby/sdk@9.0.0` postinstall patch applied.
- `npm test`: **128 tests passed across 9 test files**.
- `npm run typecheck`: passed.
- `npm run build`: passed. Next.js compiled and generated the application routes.
- `npm audit --omit=dev --audit-level=moderate`: passed the configured threshold.

The dependency audit still reports **3 low-severity vulnerabilities** in the existing Lightning invoice dependency chain. The CI gate is set to fail on moderate or higher severity. This is not a statement that the dependency graph has zero advisories. Do not use `npm audit fix --force` without reviewing the breaking-change implications.

The code verification commit above passed GitHub Actions on 19 November 2026. The workflow ran `npm ci`, tests, typecheck, production build and `npm audit --omit=dev --audit-level=moderate`; all steps completed successfully. The verification-report commit `b454dafdf602cfa4514f09796e3ac696059dcbca` also passed its own workflow run: https://github.com/ansonj-dev/jefpass/actions/runs/44564741377.

## Test coverage

The previously verified 128-test suite covers:

| Test file / slice | Passing tests | Boundary |
|---|---:|---|
| Backend and authorization | 23 | SQLite, account/session handling, ownership, customer proofs, receipts, HTTP guards and wallet encryption |
| Browser/client cryptography | 25 | Canonical receipt hash, Ed25519, tampering and Nostr receipt-event verification |
| SDK response handling | 52 | ESM/CJS envelope validation, method correlation, malformed responses and cleanup with stubbed transport |
| Lightning adapter | 15 | Signed fixture invoices, amount/network/hash/preimage checks, preflight/dispatch failures and UNKNOWN reconciliation |
| AI assistant | 4 | Local fallback, strict output schema and no financial authority |
| Origin handling | 2 | Local origin behavior and explicit production-origin protection |
| Portable bundles | 2 | Offline signature/scope verification and issuer pin handling |
| State evidence | 2 | Completion is not settlement; unverified SETTLED labels are insufficient |
| Workflow guards | 3 | Invoice eligibility, rejected quotes and service-state classification |

All wallet response fixtures and locally signed invoices are synthetic test inputs. They are not real wallet payments or evidence of external network interoperability.

## Recorded local browser workflow

The earlier development verification recorded this local unpaid journey:

1. Registered a dedicated demo technician through the UI.
2. Created a 1,000-sat laptop repair quote with a random expiring customer QR/link.
3. Opened the customer page in another tab without requiring a customer account.
4. Recorded customer acceptance signed by its browser key.
5. Marked work complete from the worker account.
6. Recorded completion acknowledgement from the same customer signing session.
7. Confirmed payment remained `NOT_REQUESTED` throughout; invoice creation was disabled without a wallet.
8. Issued an immutable server-signed unpaid receipt.
9. Browser accepted its canonical SHA-256 commitment and Ed25519 issuer signature; worker Nostr attachment was absent.
10. Opted the job into the public passport: one selected acknowledged record, zero verified payments; private title/description were omitted.
11. Switched to French and checked mobile layout at 390px; worker, customer and verifier had no horizontal overflow.
12. Disabled connectivity on the loaded worker page, created one local queued draft, reconnected, and observed one new QUOTED job and an empty queue. No payment state changed.
13. Ran the authenticated demo seed script twice; both runs returned the same two quoted/unpaid job IDs.
14. Ran the independent private-bundle verifier against the browser-created receipt: scope, receipt signature and customer signatures passed; payment evidence was correctly `NOT_CLAIMED`, worker signature `NOT_ATTACHED`, issuer `NOT_PINNED` without an independently supplied trust key.
15. Confirmed the assistant fallback returned `Local draft, no AI`, no financial fields, and preserved the entered amount.
16. Production workbench and receipt verifier reloaded without new runtime errors at 390, 768 and 1440 pixels; no horizontal overflow. Production responses included CSP, no-referrer and frame-denial headers.

This local browser evidence is historical development evidence, not a test rerun by the GitHub Actions runner and not physical-device or customer usability certification.

## Cloudflare D1 deployment

The project owner created an empty Cloudflare D1 database named `jefpass-db` (database ID `162b1629-d063-4d11-ac7a-ffdc8e3b743d`, APAC). This revision adds the D1 binding, schema migration, OpenNext custom Worker entry point and a synchronous compatibility adapter backed by D1. The tests cover persistence across requests, registration/login/session reuse, stable encryption/issuer keys, rollback and duplicate-account conflicts. The Cloudflare Worker deploy and live account smoke test must still be verified after this commit; no successful live registration is claimed here.

Existing local SQLite files are not imported automatically. The previous Appwrite deployment was deleted by the project owner and is no longer part of the hosted architecture.

## External proof blockers

- **Genuine external Lightning settlements: 0 in the recorded evidence.** The code implements a receive-only NWC adapter and settlement checks, but the adapter has not yet been demonstrated against a genuine receiving wallet and separate payer wallet.
- External NIP-07 worker signing and relay publication have not been exercised in the recorded evidence.
- No user interviews, adoption metrics or field pilot are claimed.
- The Cloudflare production Worker deployment and live D1 smoke test are not yet verified by this report.
- AI provider quality, cost and compatibility have not been validated; AI is disabled by default.

## Important trust boundaries

- Mainnet is disabled; default is REGTEST / NO REAL MONEY.
- The public receipt verifier checks the canonical hash and Ed25519 signature against the current installation key served by the same server. It is not an independent issuer identity registry or live wallet query.
- Private proof exports include sensitive invoice, preimage and customer-action data and must not be published.
- Customer Nostr signatures establish control of a browser key, not legal identity.
- Worker receipt signatures require an external NIP-07 signer. A server issuer signature is not a worker signature.
- Offline support covers non-financial drafts only. Payments and customer actions require connectivity.
- Local SQLite requires one persistent server instance. Cloudflare D1 is the hosted persistence target. The compatibility adapter hydrates all current documents for each API request and needs scale testing before production traffic.

## Reproduction

~~~~bash
npm ci
npm test
npm run typecheck
npm run build
npm audit --omit=dev --audit-level=moderate
~~~~

Use Node.js 24.x. Do not skip installation scripts; the SDK patch is required.

## Evidence statement

JëfPass has historical CI-verified application checks. The Cloudflare D1 persistence refactor and its Cloudflare-specific build must pass the current workflow, and a live register/login smoke test must then be completed before claiming hosted persistence is verified. The project still lacks externally verified wallet settlement, user-validated impact and production certification. Those are next release gates, not claims made by this report.
