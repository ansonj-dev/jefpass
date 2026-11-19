# Integration Contracts

This document records the current integration boundaries. A code path or fixture test is not proof that an external service has been exercised.

## 1. Lightning through Nostr Wallet Connect

### Connection model

A worker connects a dedicated NWC URI in the authenticated Connections view. The server validates the URI scheme, wallet public key, secret and relay list. Relays must use WSS and exactly match the operator's NWC_ALLOWED_RELAYS allowlist after URL normalization.

The NWC credential is encrypted using AES-256-GCM. New records use a versioned envelope with worker-specific authenticated data. Earlier unversioned envelopes remain readable for compatibility.

### Least privilege

The JëfPass adapter requires the NWC get_info response to advertise only the methods it needs:
- get_info
- make_invoice
- lookup_invoice

The app does not call pay_invoice, keysend or any spending method. Provision the connection inside the wallet with only these permitted methods. The worker wallet, provider and host remain trust boundaries.

### Invoice creation

1. Reserve the operation durably in SQLite.
2. Validate the existing wallet fingerprint and configured network.
3. Call get_info and validate the network and connection methods.
4. Cross the dispatch boundary and call make_invoice exactly once.
5. Validate the returned incoming invoice, signed BOLT11 content, exact amount, network, expiry and payment hash.
6. Persist the invoice identity before showing it to the customer.

A known read-only preflight failure before make_invoice dispatch becomes FAILED. The UI may offer a fresh attempt because JëfPass knows no invoice request was sent.

After dispatch begins, any timeout, disconnect, malformed response or uncertain transport result becomes UNKNOWN. JëfPass does not retry or create a replacement invoice automatically. If no invoice identity was returned, the original wallet operation may require manual investigation with the wallet provider.

### Settlement verification

Reconciliation always looks up the original payment hash using the original wallet and network. SETTLED requires:
- incoming invoice type;
- exact amount in millisatoshis;
- payment hash matching the original decoded BOLT11 invoice;
- wallet-reported settled status (or a compatible absent-state response with settled_at);
- a valid 32-byte preimage;
- SHA-256(preimage) equal to the original payment hash;
- a plausible settlement timestamp.

Unsupported or contradictory incoming-invoice states remain UNKNOWN. The adapter does not treat non-core failed/cancelled incoming states as definitive settlement or expiry evidence.

Mainnet is disabled. The default network is REGTEST / NO REAL MONEY. Signet and testnet require exact agreement with the wallet's get_info response; their BOLT11 prefix is shared, so the prefix alone does not distinguish them.

### Genuine payment evidence

Automated tests use synthetic signed invoices and wallet-response fixtures. These establish adapter behavior under controlled inputs, not live network settlement. The recorded verification evidence reports zero genuine external wallet settlements. Do not claim the wallet gate has been demonstrated until a separate payer wallet pays a real test-network invoice and the JëfPass receiver reconciles the matching preimage.

## 2. Nostr

### Customer action proofs

Customer accept, acknowledge and dispute actions use JëfPass-specific ephemeral kind 27236. Events bind the job ID, canonical scope hash, action and one-time nonce. They are verified by the API and recorded in SQLite. They are not published to public relays.

NIP-98 uses kind 27235 for HTTP authentication; customer proof events must not use that kind. JëfPass proofs contain no tags and are not NIP-98 authentication.

The browser creates a random key scoped to the job in sessionStorage. Acceptance pins that public key for subsequent acknowledgement. Losing the browser session can prevent acknowledgement because JëfPass does not silently replace the signing key or claim legal identity.

### Worker receipt commitments

A worker may connect an external NIP-07 signer. The worker's public key is stored on the profile. Publishing a receipt:
1. asks the external signer for its public key;
2. checks it against the worker profile;
3. signs a kind-30078 event with canonical receipt commitment content and one d tag;
4. verifies the signed event in the browser;
5. publishes only the minimal commitment to configured public relays;
6. submits the event to the server, which verifies and stores it with the signer key.

No worker private key is imported into the server. The event does not include the full receipt or payment secret. External signer and relay publication still need real-world testing.

## 3. Receipt cryptography

The receipt payload uses canonical JSON with lexicographically sorted object keys, preserved array order and safe integer numbers. SHA-256 commits to the canonical UTF-8 payload. Ed25519 signs the same bytes.

Public verification checks integrity and the current installation issuer key. It does not query a live wallet. The public payment state is an issuer-signed snapshot.

The private bundle verifier can inspect invoice and preimage evidence outside the database. It checks the BOLT11 amount/hash/network and preimage relationship. Pin the issuer key through an independent channel using TRUSTED_ISSUER_PUBLIC_KEY; otherwise the bundle is not anchored to independently verified issuer identity.

## 4. AI job-draft assistant

AI is an optional writing helper only.

- It accepts a short job description and language.
- It can return title, description and category only.
- The worker reviews and edits the result before saving.
- No amount, approval, completion, receipt or payment fields are accepted.
- No provider call happens unless AI_ENABLED=true and OPENAI_API_KEY are both set.
- The default behavior is a local non-AI draft.
- Wallet URIs, private keys and seed phrases are not required or requested.

The provider output and quality have not been validated in a field pilot. Keep AI disabled for the core demo; the product does not need paid model calls to run.

## 5. Offline drafts

IndexedDB stores worker-scoped, non-financial drafts and queued job creation. A stable client ID and server-side deduplication prevent duplicate jobs on repeated sync. The queue is flushed only for the authenticated worker who owns it.

No payment, invoice, customer signature or acknowledgement is queued offline. The app manifest is an install hint, not a guaranteed offline shell. Customer confirmation and Lightning settlement require connectivity.

## 6. Provider and deployment requirements

- Node.js 24.x with node:sqlite.
- One persistent application instance.
- Exact HTTPS APP_ORIGIN in production.
- Persistent data directory, encryption key and issuer key.
- Trusted NWC WSS relay allowlist.
- Optional public Nostr relay list.
- Mainnet remains disabled.

See README.md and ARCHITECTURE.md for setup and data flow.
