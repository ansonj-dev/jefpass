# JëfPass Limitations

This file separates implemented behavior from unverified claims and future work.

## Current evidence

| Area | Implemented | Not yet established |
|---|---|---|
| Worker workflow | Account, profile, quote, customer link, completion and receipt | Real technician adoption or retention |
| Customer acknowledgement | Signed accept, acknowledge and dispute events | Legal identity or non-repudiation against a colluding technician |
| Lightning | NWC adapter, BOLT11 validation, invoice reservation, reconciliation and preimage checks | Genuine external wallet settlement in the recorded verification evidence |
| Receipt | Canonical hash, server Ed25519 signature, public verifier, private export | Independent issuer identity without key pinning, live wallet lookup or physical work quality |
| Nostr | Customer event proofs; optional NIP-07 worker event path | External NIP-07 signing and relay publication exercise |
| Offline | IndexedDB non-financial drafts and sync | Offline payments, signature queue, service-worker app shell or guaranteed offline reload |
| AI | Strict draft output and local fallback | Paid provider quality, cost or field usefulness |
| UX | English/French and browser checks documented | Physical-device accessibility, low-bandwidth and usability pilot |
| Operations | Local SQLite mode; Appwrite TablesDB persistence adapter and live SSR demo; CI workflow | External wallet proof, scale testing, independent security review and disaster-recovery drill |

## Payment safety boundaries

- Mainnet is disabled.
- Default network is regtest and displays NO REAL MONEY.
- The worker NWC connection is intended to have only get_info, make_invoice and lookup_invoice permission.
- JëfPass never invokes a spending method.
- A preflight failure known to happen before make_invoice dispatch is FAILED and may be retried.
- A failure after make_invoice may have been dispatched is UNKNOWN and must not be retried automatically.
- If the wallet does not return an invoice hash after an ambiguous dispatch, the original operation may require manual provider investigation.
- SETTLED requires wallet-reported incoming status, exact amount, matching hash and valid preimage.
- Test fixtures are not real wallet settlements.

## Receipt trust boundaries

Public verification checks the canonical payload, SHA-256 commitment and Ed25519 signature against the public key returned by the same installation. This demonstrates internal integrity, not an independently trusted legal issuer identity.

Public payment status is an issuer-signed snapshot. It does not query a live wallet. Authorized private exports include invoice and preimage evidence for offline checks. A verifier needs an independently obtained issuer key to pin identity.

A signature does not prove that a repair was performed well. Customer key control does not prove that the signer is the named customer.

## Data and deployment boundaries

- Local development uses a persistent SQLite file. Appwrite Sites uses TablesDB as the durable source of truth through a request-scoped compatibility adapter.
- The Appwrite adapter currently reads the records table for each API request, so it is intended for a small prototype dataset, not high-volume production traffic.
- Appwrite transactions currently cap a single request at 100 changed rows on the Free plan; an oversized mutation fails closed.
- Row payloads are capped at 60 KB by the adapter.
- Existing local SQLite databases are not automatically imported into Appwrite.
- Appwrite's private secrets table stores the persistent wallet-encryption and receipt-issuer keys. Keep that table private and include it in backups.
- Local database rows, WAL/journals, exports and backups are not wholly encrypted by the NWC credential protection.
- The current issuer-key design has no managed rotation or historical key registry.
- NWC encryption is worker-bound for new v1 records; legacy records remain readable until saved again.
- Customer action keys live in job-scoped sessionStorage and have no recovery flow.
- Public receipt metadata can be correlated; Nostr relay events may persist indefinitely.

## Features intentionally deferred

- Service photo uploads and evidence storage.
- Voice input and Wolof localization.
- Public worker discovery or marketplace.
- Identity verification, ratings, credit scoring or lending.
- Escrow, refunds guarantee and automated spending.
- Mobile-money provider integration or fiat cash-out.
- Full offline app shell and offline financial actions.
- Independent security review and external audit.

## Honest claims

Do not claim:
- a live or real-money payment if the test uses fixtures or simulation;
- that the project is audited, trustless or production-ready;
- that a customer signature verifies a person's identity;
- that a receipt proves service quality;
- that an AI model verifies a payment or approves work;
- that the product works offline for payments.
