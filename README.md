# JëfPass

**Your work. Your proof.**

JëfPass is an open-source work-record and payment-evidence passport for independent repair technicians. It helps a worker agree a clear scope with a customer, record completion, verify an incoming Lightning payment, and keep a portable, shareable history of completed work.

[![JëfPass CI](https://github.com/ansonj-dev/jefpass/actions/workflows/ci.yml/badge.svg)](https://github.com/ansonj-dev/jefpass/actions/workflows/ci.yml) · [Architecture](ARCHITECTURE.md) · [Threat model](THREAT_MODEL.md) · [Demo guide](DEMO_GUIDE.md)

## The problem

Independent workers often rely on chat messages, paper notes and separate payment applications to document jobs. A worker may have difficulty carrying a consistent record of agreed work, customer acknowledgement and payment evidence from one customer or platform to another.

JëfPass explores a narrow workflow: one technician and one customer, starting with phone, laptop and small-appliance repairs. This is a product hypothesis, not a claim that interviews or adoption research have already validated the need. The project currently has no completed field interviews or measured pilot.

## What JëfPass does

1. A technician creates a quote with a clear description, category, amount and optional due date.
2. The customer opens an expiring link, reviews the exact scope and signs acceptance in their browser. A customer account is not required.
3. The technician records completion. The same customer signing session can acknowledge the work or submit a dispute.
4. The technician connects a dedicated receive-only Nostr Wallet Connect (NWC) connection and requests an invoice.
5. JëfPass verifies the exact BOLT11 invoice and later reconciles the original invoice against the same wallet. A payment is marked SETTLED only when the wallet reports the incoming invoice settled and the returned preimage hashes to the original payment hash.
6. JëfPass issues an immutable, signed receipt. A worker can keep it private, export a private proof bundle, or opt a completed record into a public passport.

**Service facts and payment facts remain separate.** Customer acceptance does not prove the work was completed. A completion acknowledgement does not prove that a payment settled. A receipt signature proves that the application issuer signed a specific record; it does not certify repair quality or legal identity.

## Product status and evidence

This repository contains a working Next.js prototype, not a production-certified financial service.

- The account, worker profile, job lifecycle, customer confirmation, public passport, receipt issuer signature, browser receipt verifier, private export, and NWC adapter are implemented.
- The NWC integration has automated tests for invoice validation, exact amounts, network checks, payment-hash matching, preimage verification and uncertain outcomes.
- The recorded verification report describes an unpaid browser journey, a private bundle check and an offline draft sync.
- **Genuine external wallet settlements: 0 in the recorded verification evidence.** The adapter implementation and its fixture tests do not prove live wallet interoperability.
- External NIP-07 signing and public relay publication have not been independently demonstrated in the recorded evidence.
- No user interviews, adoption metrics or field pilot are claimed.
- A public Appwrite-hosted demo is live. Its account, session, job, receipt, wallet-metadata and rate-limit records use Appwrite TablesDB; this is not a production-certified payment service.

See [VERIFICATION.md](VERIFICATION.md) and [LIMITATIONS.md](LIMITATIONS.md) for the evidence boundary. Never present a fixture, seeded record or screenshot as a real payment.

## Why these protocols are used

| Technology | Purpose |
|---|---|
| Bitcoin Lightning | Creates incoming invoices and provides wallet-reported settlement evidence |
| Nostr Wallet Connect | Connects to a worker-controlled Lightning wallet using a dedicated, receive-only connection |
| Nostr events | Signs customer actions and optionally lets a worker sign a receipt commitment with an external NIP-07 signer |
| SHA-256 and Ed25519 | Commits to and signs receipt content so tampering can be detected |
| AI | Optional assistant to draft job descriptions; it has no authority over consent, receipts or payments |
| IndexedDB | Saves non-financial job drafts locally and syncs them when connectivity returns |

## Interface

The interface supports English and French and is designed mobile-first.

- Public landing page: /
- Worker workspace: /app
- Customer confirmation: /confirm/[token]
- Public receipt verifier: /verify/[receipt-id]
- Opt-in public worker passport: /passport/[worker-id]

The offline feature is deliberately limited to local job drafts and queued job creation. It does not support offline Lightning payments, offline customer signatures or a guaranteed offline application-shell reload.

## Architecture at a glance

- Next.js App Router and TypeScript run in the Node.js runtime.
- API handlers enforce account ownership, request-origin checks, bounded JSON input and rate limits.
- Local development uses Node 24 built-in SQLite on disk. Appwrite Sites uses TablesDB as the persistent source of truth and a request-scoped SQLite compatibility layer so the existing synchronous service logic behaves the same.
- NWC credentials are encrypted with AES-256-GCM. New versioned envelopes use worker-specific authenticated data; the reader remains compatible with the earlier envelope format.
- Customer action proofs use JëfPass application-specific ephemeral Nostr kind 27236. They are not published to relays. NIP-98 reserves kind 27235 for HTTP authentication.
- Worker receipt commitments use kind 30078 and are published only after an external NIP-07 signer signs them.

See [ARCHITECTURE.md](ARCHITECTURE.md) for data flow, routes, state transitions and trust boundaries.

## Quick start

### Requirements

- Node.js 24.x
- npm
- A persistent writable local data directory
- One running application instance

SQLite uses Node's built-in node:sqlite API in local development. On Appwrite Sites, an API request receives a temporary SQLite mirror populated from TablesDB; changes are committed atomically back to TablesDB. The Site does not depend on a persistent local filesystem.

### Install and run

~~~~bash
npm ci
npm run dev -- --port 3100
~~~~

Open http://localhost:3100.

Use the committed lockfile. The SDK postinstall patch is required; do not install with scripts disabled.

### Environment

Start from .env.example. The essential settings are:

| Variable | Purpose |
|---|---|
| DB_PATH | Persistent SQLite database path; defaults to ./data/jefpass.sqlite |
| APP_ORIGIN | Exact browser-facing origin. Required in production and must use HTTPS |
| APP_ENCRYPTION_KEY | Optional 32-byte key encoded as 64 hex characters or base64. Local mode generates a key beside the SQLite database; Appwrite mode stores the generated key in the private `secrets` table |
| LIGHTNING_NETWORK | regtest by default; testnet and signet are supported when the wallet reports the same network. Mainnet is disabled |
| NWC_ALLOWED_RELAYS | Exact comma-separated WSS relay allowlist. Empty means wallet connections fail closed |
| NEXT_PUBLIC_NOSTR_RELAYS | Optional public relay list for worker commitment publication |
| AI_ENABLED | Must be explicitly true before any provider call is made |
| OPENAI_API_KEY | Optional server-side key; never expose it to the browser |
| OPENAI_MODEL | Optional model identifier; defaults to gpt-4.1-mini |
| APPWRITE_DATABASE_ID | Appwrite Site mode only; TablesDB database ID (`jefpass-db`) |
| APPWRITE_TABLE_ID | Appwrite Site mode only; records table ID (`records`) |
| APPWRITE_SECRETS_TABLE_ID | Appwrite Site mode only; private key table ID (`secrets`) |

For Appwrite, set APP_ORIGIN to the exact HTTPS Site origin and the three APPWRITE_* IDs above. Appwrite injects the Site ID, project ID, regional API endpoint and a short-lived request-scoped API key; no long-lived API key belongs in the repository or browser. The adapter stores application rows and persistent signing/encryption keys in private TablesDB tables. Existing local SQLite files are not automatically imported.

### Checks

~~~~bash
npm test
npm run typecheck
npm run build
npm audit --omit=dev --audit-level=moderate
~~~~

GitHub Actions runs the same checks on pushes to main and pull requests.

## Demo data

Seed only quoted, unpaid demonstration jobs for a dedicated demo account:

~~~~bash
DEMO_EMAIL="demo@example.test" DEMO_PASSWORD="replace-with-a-private-password" npm run demo:seed
~~~~

Do not use real customer data for a public demo. Seeded jobs are labelled and do not include customer acknowledgements, invoices or payment settlements.

## Lightning wallet setup

The default network is REGTEST / NO REAL MONEY. Mainnet is always disabled.

1. Create a dedicated NWC connection in a compatible wallet.
2. Restrict the connection to get_info, make_invoice and lookup_invoice. Do not grant spending permissions.
3. Configure the exact WSS relay URL in NWC_ALLOWED_RELAYS, including its normalized trailing slash.
4. Configure LIGHTNING_NETWORK to match the wallet's get_info response.
5. Paste the NWC URI into the authenticated Connections view. The server checks the connection, encrypts it at rest and displays only the wallet identity summary.
6. Create a completed job, request its invoice, and pay that invoice from a separate compatible wallet on the same test network.
7. Reconcile the original invoice. Do not create a replacement if the state is UNKNOWN.

A genuine external payment still needs to be performed and captured as evidence before claiming the wallet gate is demonstrated. Never fund this prototype with mainnet money.

## Receipts and independent verification

Each receipt contains a canonical payload, SHA-256 commitment and Ed25519 signature from the application issuer. The public verifier recomputes the commitment and verifies the signature against the current installation key returned by the same JëfPass server.

That is an integrity check, not an independent identity or payment oracle. A public payment status is an issuer-signed snapshot of wallet evidence at issuance, not a live wallet query. Authorized private exports include the invoice, preimage and signed customer action history so the bundle verifier can check available evidence offline.

Obtain the issuer public key through an independent trusted channel and set TRUSTED_ISSUER_PUBLIC_KEY when running the private bundle verifier. Without an independently pinned key, a self-contained signature is internally consistent but does not establish who controls the issuer.

~~~~bash
npm run verify:bundle -- path/to/private-export.json
~~~~

Private proof exports can contain customer details, invoices and preimages. Keep them private.

## Security model

- No private wallet spending keys or seed phrases are requested.
- NWC is receive-only by design and should be provisioned with only the required methods.
- Invoice creation is reserved before external calls.
- A preflight failure known to occur before make_invoice dispatch is marked FAILED and may be retried.
- After make_invoice dispatch begins, a timeout or transport error is UNKNOWN. JëfPass never blindly retries an ambiguous request.
- Settlement requires wallet-reported incoming status, exact amount and hash, and a matching 32-byte preimage.
- Customer links are high-entropy, hashed at rest and expiring; signed actions bind the job scope and a one-use nonce.
- Customer keys prove control of a browser key, not a real-world identity.
- AI output is a reviewed draft only. AI cannot approve work, sign receipts, set payment state or spend funds.

See [THREAT_MODEL.md](THREAT_MODEL.md). This is a security-conscious prototype, not an independent audit or production certification.

## Scope and non-goals

JëfPass is not a wallet, exchange, escrow, lending service, public rating system, legal identity provider or mobile-money cash-out service. It does not prove physical work quality. It does not claim that a customer signature is a verified identity or that a server receipt signature independently proves a Lightning payment.

The project is MIT licensed. Contributions should preserve the separation between service state and payment state, and should never weaken the conservative UNKNOWN handling.

## Documentation

- [PROJECT_BRIEF.md](PROJECT_BRIEF.md) — product hypothesis and judging-criteria mapping
- [ARCHITECTURE.md](ARCHITECTURE.md) — components, API routes and state transitions
- [APPWRITE.md](APPWRITE.md) — Appwrite TablesDB schema, SSR credentials and persistence behavior
- [INTEGRATIONS.md](INTEGRATIONS.md) — Lightning, Nostr, AI and offline integration contracts
- [THREAT_MODEL.md](THREAT_MODEL.md) — threats, controls and residual risk
- [VERIFICATION.md](VERIFICATION.md) — automated and manual evidence
- [LIMITATIONS.md](LIMITATIONS.md) — current boundaries
- [DEMO_GUIDE.md](DEMO_GUIDE.md) — safe repeatable demonstration
- [PUBLICATION_CHECKLIST.md](PUBLICATION_CHECKLIST.md) — release and submission review

## License

MIT. See [LICENSE](LICENSE).
