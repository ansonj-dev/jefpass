# JëfPass Threat Model

This describes prototype controls and residual risk. It is not an independent security audit, penetration test or production certification.

## 1. Assets to protect

- NWC connection secrets and worker wallet association.
- Worker account sessions and profile data.
- Job descriptions, prices, customer links and customer signatures.
- Original Lightning invoice identity, payment hash and preimage.
- Receipt issuer private key and public verification metadata.
- Worker Nostr public-key association and signed receipt events.
- Private proof exports, SQLite database, WAL, journals and backups.

## 2. Trust boundaries

| Boundary | Risk |
|---|---|
| Worker/customer browser to API | Browser state and user inputs are untrusted; XSS or device compromise can steal active browser keys |
| Customer link to signed action | Link is a bearer capability; signature proves key control, not legal identity |
| Application process to SQLite and secret files | The host is trusted with authorization, decryption and issuer signing |
| Application to NWC relay and wallet | Relay may be unavailable or censor; wallet is authoritative for invoice status |
| Public receipt to browser verifier | Browser checks content against the issuer key served by the same installation unless the key is independently pinned |
| Worker browser to Nostr signer and relays | Worker controls external signing; public relay events can persist and be correlated |
| Optional AI provider | Text is sent to an external processor only after explicit server-side opt-in |

## 3. Controls implemented

### Authentication and API

- Passwords use salted scrypt.
- Session tokens are random and only hashes are persisted.
- Cookies are HttpOnly, SameSite=Strict and Secure when HTTPS is used.
- Every mutation requires exact Origin, custom request header and same-site Fetch Metadata where present.
- Production requires explicit APP_ORIGIN over HTTPS.
- Request JSON is streamed, capped at 32 KB and parsed by strict Zod schemas.
- Per-caller and authentication rate limits persist in SQLite.
- Private job reads and changes verify worker ownership.

### Customer capabilities and signatures

- Customer link tokens contain 256 bits of randomness and are hashed at rest.
- Links expire after seven days; rotating the link invalidates the prior token.
- Challenges and one-use nonces expire after five minutes.
- Customer proofs use JëfPass ephemeral Nostr event kind 27236, not NIP-98 kind 27235.
- Proofs bind action, job ID and canonical scope hash. They contain no relay tags.
- Nonce consumption and state mutation occur in one transaction.
- Acceptance pins the browser public key for later acknowledgement.

Residual risk: a stolen unbound link can be redeemed by an attacker. A technician can collude with or impersonate a customer. Browser-key control is not a verified person. Losing the sessionStorage key can prevent follow-up acknowledgement.

### Wallet credentials and Lightning

- NWC credentials are encrypted with AES-256-GCM.
- New v1 envelopes bind the ciphertext to the worker ID using authenticated additional data.
- Legacy unversioned envelopes remain readable during transition.
- Wallet network and required methods are validated.
- The app invokes only get_info, make_invoice and lookup_invoice.
- Mainnet is disabled.
- Invoice amount, network, signature, expiry and hash are checked before use.
- Invoice operations are reserved before external calls.
- Known preflight errors before dispatch are safely retryable.
- After dispatch begins, uncertain results become UNKNOWN and are never blindly retried.
- Reconciliation uses the original invoice hash and wallet identity.
- SETTLED requires wallet-reported incoming settlement, exact amount and matching preimage.

Residual risk: a compromised host can decrypt the NWC URI and use its granted invoice-creation permission. The application host and wallet service remain trusted. Missing invoice identity after an ambiguous request may require manual provider investigation. No genuine external settlement has been demonstrated in the recorded evidence.

### Receipts and Nostr

- Receipt payloads are canonicalized.
- SHA-256 commitment and Ed25519 issuer signature detect tampering.
- Public receipts omit the invoice and preimage.
- Private exports are available only to the authenticated worker.
- Worker Nostr commitments require external NIP-07 signing and are checked against the worker public key at attachment time.
- The verified signer public key is retained with the event for later checks.

Residual risk: the current installation issuer key is not independently trusted unless pinned through a separate channel. Server signatures do not prove physical work quality. Public receipt metadata can be correlated. Nostr relays may retain events indefinitely.

### AI and offline

- AI is disabled by default.
- Provider calls require both an explicit enable flag and server-only key.
- The schema allows title, description and category only.
- AI has no payment, signature or approval authority.
- Offline queue contains non-financial job drafts only and verifies the owning worker before synchronization.

Residual risk: user text can contain sensitive information. Provider retention and output quality are not validated. IndexedDB drafts are not an encrypted vault and can be lost with browser storage. No guaranteed offline app shell exists.

## 4. Storage and operations

SQLite is local and persistent, not distributed. Job data, WAL/journals, exports and backups are not protected by NWC credential encryption. Use OS disk encryption, strict filesystem ACLs, encrypted backups and an isolated restore procedure. Preserve database and generated issuer/encryption keys together.

Production must use HTTPS and exact APP_ORIGIN. Restrict network access at the reverse proxy and do not trust arbitrary forwarded host headers.

## 5. Remaining high-value security work

- Independent security review and penetration test.
- Genuine NWC wallet interoperability and test-network settlement.
- Crash/restart drill across the dispatch boundary.
- Encryption key rotation and operator recovery runbook.
- Consistent encrypted backup and restore drill.
- Customer session-loss and key recovery research.
- Slow-network and physical-device tests.
- Historical issuer key registry or independent trust anchor.

The prototype should not be marketed as audited, trustless or production-ready.
