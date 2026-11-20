# JëfPass Architecture

This document describes the current single-instance prototype. It is not a target-state architecture or a security certification.

## 1. System context

~~~~mermaid
flowchart TD
  W[Worker browser] --> APP[Next.js Node application]
  C[Customer browser] --> APP
  W --> IDB[IndexedDB: non-financial drafts]
  APP --> LOCALDB[Local SQLite file]
  APP --> D1[Cloudflare D1 binding]
  APP --> NWC[NWC client through allowlisted WSS relay]
  NWC --> WALLET[Worker receiving wallet]
  PAYER[Customer Lightning wallet] --> WALLET
  W --> NIP07[External NIP-07 signer]
  NIP07 --> RELAYS[Public Nostr relays]
  APP --> VERIFY[Public receipt API]
  VERIFY --> V[Browser receipt verifier]
~~~~

## 2. Runtime

- Next.js App Router with TypeScript.
- Node.js 24 runtime; API routes explicitly use the Node.js runtime.
- Local development uses Node built-in SQLite via node:sqlite and a persistent local database file.
- Cloudflare Workers use D1 as their durable source of truth. Each API request hydrates a request-scoped synchronous compatibility database from D1, runs the existing service code without invoking node:sqlite, then commits queued writes atomically through D1 batch.
- NWC client adapter using the pinned @getalby/sdk 9.0.0.
- BOLT11 invoice decoding and validation using bolt11.
- nostr-tools for event construction and signature verification.
- idb-keyval for local non-financial drafts.
- Zod for strict request validation.

The Cloudflare runtime does not rely on persistent local files. Each API request hydrates documents and rate-limit rows from D1 and commits mutations in a D1 batch. The adapter currently reads all application documents for each API request and is a compatibility bridge, not a high-scale query architecture; direct service-level D1 queries remain future optimization work.

## 3. Application routes

| Route | Purpose |
|---|---|
| / | Public English/French landing page |
| /app | Authenticated worker workspace |
| /confirm/[token] | Customer quote review and signed actions |
| /verify/[id] | Public receipt integrity and signer verification |
| /passport/[id] | Worker-selected public job history |
| /api/session | Current worker, network and receipt issuer public key |
| /api/auth/register, /api/auth/login, /api/auth/logout | Account and session lifecycle |
| /api/profile | Worker profile |
| /api/jobs | Create and list jobs |
| /api/jobs/[id] | Owned job detail |
| /api/jobs/[id]/share | Rotate an expiring customer link |
| /api/jobs/[id]/complete | Record worker completion |
| /api/jobs/[id]/invoice | Reserve and create an incoming Lightning invoice |
| /api/jobs/[id]/reconcile | Look up the original invoice |
| /api/jobs/[id]/receipt | Issue an immutable receipt snapshot |
| /api/jobs/[id]/visibility | Opt a completed record into the public passport |
| /api/customer/[token] | Capability-scoped customer view and signed action |
| /api/wallet | Connect or disconnect worker NWC |
| /api/receipts/[id] | Public receipt and verification metadata |
| /api/receipts/[id]/nostr | Store a verified worker commitment event |
| /api/passport/[id] | Public worker passport |
| /api/export | Authorized private proof bundle |
| /api/ai/draft | Optional job-description draft |

## 4. Persistence and secrets

The application keeps its existing synchronous SQLite data contract: documents are keyed by kind and identifier, with a separate rate-limit table. Local development uses data/jefpass.sqlite. On Cloudflare Workers, each API request loads documents and rate_limits rows from D1 into a request-scoped in-memory compatibility database. Existing synchronous service functions continue to use prepare().get(), all() and run(); this compatibility layer never constructs or calls the non-functional Workers node:sqlite stub. Writes are queued as prepared D1 statements and committed atomically through DB.batch(). The temporary in-memory view is discarded after the response.

The D1 database jefpass-db contains three private application tables: documents stores JSON application records (kind, id, body); rate_limits stores counters and reset timestamps; app_secrets stores the durable AES-256 key and Ed25519 receipt issuer private key. Access is granted only through the Worker's private DB binding. There is no public database credential or browser-side database access.

The compatibility layer currently loads all documents and rate-limit rows at the start of each API request. This preserves the prototype's synchronous service contract but is not a high-scale query pattern; optimize to direct, filtered D1 queries before the dataset grows substantially. See CLOUDFLARE.md for the schema and deployment settings.

### Wallet credential encryption

New NWC envelopes use AES-256-GCM with a random 12-byte nonce, authentication tag and worker-specific associated data. The version prefix is v1. Binding the ciphertext to the worker ID prevents moving an encrypted wallet record from one worker to another without authentication failure.

The decryptor retains support for the earlier unversioned envelope so existing installations can read old records. Newly saved wallet credentials use the versioned format. A key rotation and managed recovery workflow is not yet implemented.

### Database assumptions

- Local mode: preserve the SQLite database and its generated key files together.
- Cloudflare mode: documents, rate limits and secret keys live in D1 tables accessible through the Worker's DB binding.
- Cloudflare mode currently loads all documents and rate limits into a request-local memory database. Keep the prototype dataset modest; optimize to direct filtered D1 queries before scaling.
- The application imposes a 100-statement per-request batch safety cap; larger mutations fail closed rather than partially writing.

## 5. Worker and customer workflow

~~~~mermaid
sequenceDiagram
  participant W as Worker
  participant A as JëfPass API
  participant C as Customer browser
  participant N as NWC wallet
  participant P as Customer payer wallet
  W->>A: Create quote
  A-->>W: Job plus expiring customer capability
  W->>C: Share confirmation link / QR
  C->>A: Retrieve exact quote and challenge
  C->>C: Sign accept event with temporary browser key
  C->>A: Submit signed acceptance
  A-->>W: Job is ACCEPTED
  W->>A: Mark work completed
  A-->>C: Completion is available to acknowledge
  C->>A: Submit signed acknowledgement or dispute
  W->>A: Request Lightning invoice
  A->>N: get_info, then make_invoice
  N-->>A: Signed BOLT11 invoice and invoice identity
  A-->>C: Invoice for payment
  P->>N: Pay invoice
  W->>A: Reconcile original invoice
  A->>N: lookup_invoice(payment_hash)
  N-->>A: Incoming invoice status and preimage
  A->>A: Check amount, hash, preimage and settlement time
  A-->>W: Verified settlement state
  W->>A: Issue receipt snapshot
  A-->>W: Signed receipt
~~~~

A customer does not create an account. The customer capability is an expiring bearer secret. A signed event proves control of a browser-generated key, not the customer's legal identity.

## 6. Service state

Service state and payment state are separate.

### Service state

- QUOTED — worker created the quote.
- ACCEPTED — customer signed the exact quoted scope.
- COMPLETED — worker recorded completion.
- ACKNOWLEDGED — customer signed acknowledgement of completion.
- DISPUTED — customer signed a dispute action.

A job can be completed without being paid. A dispute does not erase the historical completion timestamp.

### Invoice eligibility

Invoice creation is enforced in the service layer, not only in the UI. The job must have a completion timestamp and be in COMPLETED or ACKNOWLEDGED state. It must have customer acceptance. A request made directly against the API cannot bypass this restriction.

### Payment state

- NOT_REQUESTED
- INVOICE_CREATED
- PENDING
- UNKNOWN
- SETTLED
- EXPIRED
- FAILED
- CANCELLED
- UNDERPAID
- OVERPAID

### Payment request boundary

~~~~mermaid
flowchart TD
  A[Completed accepted job] --> B[Persist reservation]
  B --> C[Validate wallet and get_info]
  C -->|Preflight fails before dispatch| F[FAILED: safe to retry]
  C -->|Preflight succeeds| D[Dispatch make_invoice]
  D -->|Valid invoice response| E[INVOICE_CREATED]
  D -->|Timeout, disconnect or malformed response| U[UNKNOWN: never blindly retry]
  E --> L[lookup_invoice on original hash]
  L -->|Pending or hold accepted| P[PENDING]
  L -->|Exact amount and matching preimage| S[SETTLED]
  L -->|Expired| X[EXPIRED]
  L -->|Missing or contradictory evidence| U
~~~~

The preflight/dispatch boundary is conservative. Once the make_invoice request may have reached the wallet, timeout or transport failure is UNKNOWN. No replacement invoice is created automatically. If the wallet never returns an invoice identity, the operation may need manual wallet/provider investigation.

The server reconciles the original invoice only. Settlement requires:
- Same worker wallet identity and network as the reserved operation.
- Original signed BOLT11 invoice.
- Exact expected integer millisatoshi amount.
- Incoming invoice record with matching payment hash.
- Wallet-reported settled status.
- Valid 32-byte preimage whose SHA-256 equals the payment hash.
- Plausible settlement timestamp.

NIP-47 marks state optional for compatibility in some wallet services. If state is absent, the adapter accepts settlement only when an authoritative settled_at value and valid preimage are present. Contradictory or unsupported incoming-invoice states remain UNKNOWN.

## 7. Nostr event design

### Customer action proof

JëfPass uses application-specific ephemeral kind 27236 for customer accept, acknowledge and dispute events. The content is a strict JSON object containing job ID, canonical scope hash, action and one-time nonce. Events contain no relay tags and are submitted to the application API; JëfPass does not publish them to relays.

NIP-98 reserves kind 27235 for HTTP authentication, so it must not be reused for customer acknowledgements. Kind 27236 lies in the NIP-01 ephemeral range. This does not make the acknowledgement a globally registered Nostr standard; it is an application-specific protocol contract.

Links expire after seven days. Nonces expire after five minutes and are consumed in the same SQLite transaction as the action state update. Acceptance pins the customer's browser public key for subsequent acknowledgement.

### Worker receipt commitment

The worker may connect an external NIP-07 signer. The signed receipt event uses kind 30078 and contains only the canonical receipt ID and commitment with one d tag. It does not publish the full receipt, customer details, invoice or preimage.

The server validates the event signature, content, d tag and signer key against the worker key at attachment time. It stores the verified signer public key with the attachment so later verification does not silently change identity when the worker profile key is rotated.

## 8. Receipt model

A receipt is an immutable snapshot containing:
- Receipt ID and issue time.
- Worker and job IDs.
- Canonical scope hash.
- Service state and timestamps.
- Agreed satoshi amount.
- Payment state, expected millisatoshis, network, source and payment hash.
- Application issuer public key.
- SHA-256 commitment and Ed25519 signature.

The public receipt omits invoice and preimage. An authorized private export includes the original invoice, preimage evidence and signed customer events where available.

### Verification boundaries

The browser verifier recomputes canonical JSON, SHA-256 and Ed25519 signature. It compares the receipt issuer key with the key returned by that same installation's session API. This is an integrity and installation-consistency check, not independently pinned issuer identity.

The private bundle verifier checks the signed receipt, job scope, customer events, worker Nostr attachment and available BOLT11 amount/hash/preimage evidence without a live database. Set TRUSTED_ISSUER_PUBLIC_KEY using a key obtained through an independent trusted channel to pin issuer identity.

Neither the application issuer signature nor the payment preimage proves physical repair quality or real-world identity. A server-signed public settlement snapshot is not a live wallet query.

## 9. Authentication and request security

- Passwords use salted scrypt hashes.
- Session tokens are random; only their hashes are persisted.
- Cookies are HttpOnly, SameSite=Strict and Secure on HTTPS.
- Mutations require matching Origin, a custom X-Jefpass header and same-site Fetch Metadata where provided.
- Production requires explicit APP_ORIGIN and HTTPS.
- JSON bodies are streamed and limited to 32 KB.
- Zod request schemas are strict.
- Job ownership is checked in service functions.
- Customer tokens are hashed at rest, scoped and expiring.
- Rate-limit counters persist in SQLite.
- NWC URI secrets are encrypted at rest and tied to the worker ID with authenticated data.

Residual risks include a trusted single application host, plaintext job data and SQLite WAL on disk, customer-browser key loss, public metadata correlation, and missing independent security review.

## 10. Deployment constraints

Before deployment:
1. Use Node.js 24.x.
2. Set APP_ORIGIN to the exact HTTPS browser-facing origin.
3. Configure the D1 binding named `DB` in wrangler.jsonc.
4. Apply the versioned D1 migration before deploying.
5. Keep the `app_secrets` table accessible only through the Worker binding; never expose secret values to a browser.
6. Back up the D1 database and protect the issuer/encryption keys.
7. Configure exact trusted WSS relays for NWC.
8. Leave mainnet disabled.
9. Run npm ci, tests, typecheck, Cloudflare build and dependency audit.
10. Test a genuine external test-network wallet payment before making a live-payment claim.

See README.md, CLOUDFLARE.md, INTEGRATIONS.md, THREAT_MODEL.md and PUBLICATION_CHECKLIST.md.
