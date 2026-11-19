# Threat Model

Implemented prototype controls, not an audit certificate. Protect private job data, customer links/keys, worker isolation, NWC delegations, password/session hashes, issuer keys, payment states and recoverable records. [VERIFICATION.md](VERIFICATION.md) records 122 passing tests, typecheck, clean build, unpaid browser workflow and offline reconnection. Genuine wallet settlements: **0**; external signer/relay publication unexercised.

## Trust Boundaries

| Boundary | Trust and exposure |
| --- | --- |
| Worker/customer browser to server | Inputs and UI state are untrusted; XSS or a stolen device can act as that browser |
| Customer capability to acknowledgement | Link grants limited bearer authority; a browser signature is not legal identity |
| Server to SQLite and secret keys | Server is trusted for access control, decryption, and issuer attestations; single-host compromise is material |
| Server to NWC relay/wallet | Relay may censor/replay; wallet is authoritative for lookup, and delegation must be receive-only |
| Receipt to browser verifier | Browser checks canonical hash and Ed25519; issuer trust is the current installation key from `/api/session`, not an independent registry or wallet query |
| Private data to public Nostr/share page | Public disclosure is effectively irreversible; metadata may remain linkable |
| Optional server AI provider | External processor may retain supplied text; disabled by default |

## Threats And Controls

| Threat | Implemented control | Validation boundary/residual risk |
| --- | --- | --- |
| Forged paid UI or receipt | Server settlement checks original incoming invoice, exact amount/hash, timestamp and SHA-256 preimage; receipt issuance rechecks stored preimage | Public `SHA256_MATCH` is an issuer claim, not a public wallet/preimage check; no genuine wallet settlement yet |
| Timeout followed by duplicate invoice | Durable pre-request reservation; original operation identity; `UNKNOWN` blocks recreation, including missing hash | Fixture coverage is not a live crash/lab drill; manual wallet investigation may be needed |
| Wallet switch or forged response | Original wallet fingerprint/network pinned; unresolved operations block changes; SDK envelope/correlation patch applied | Both module formats tested; genuine wallet interoperability unverified |
| Under/overpayment, invalid BOLT11 | `bolt11` checks, exact safe-integer msat, network, creation expiry and hash checks | Fixture checks are not live wallet interoperability; accepted hold invoices remain pending until authoritative terminal state |
| Account takeover | Scrypt with unique salts, hashed 30-day sessions, HttpOnly/SameSite=Strict cookies, Secure on HTTPS, rate limits | No MFA/account-recovery or external penetration test claimed; local HTTP lacks Secure cookies |
| Cross-worker access or CSRF | Ownership checks on private objects/export, exact Origin, `X-Jefpass: 1`, Fetch Metadata checks | Public receipt/passport endpoints are intentionally public; review proxy origin/TLS behavior before deployment |
| Stolen/replayed customer link | 256-bit token hashed at rest, seven-day expiry, five-minute single-use challenge, signed scope/action/job binding and acceptance key pin | Stolen unbound links may be redeemed; token-bearing access logs require operator redaction |
| Technician fabricates customer | Browser-key signatures distinguish recorded assertions, not verified humans | Technician/colluding parties can impersonate a customer; no identity or repair-quality guarantee |
| Credential leakage or relay SSRF | AES-256-GCM NWC storage; key outside SQLite; exact normalized target `URL.href` in operator WSS allowlist; empty fails closed | No separate private-address/DNS filter, worker-bound associated data, or versioned key envelope; compromised host can decrypt |
| Tampering or misleading signatures | Sorted canonical JSON, SHA-256 commitment, Ed25519 issuer signature; optional Nostr event bound to worker key/content/d tag | Current-install issuer trust is not external provenance; managed rotation and historical registry absent |
| Public proof/PII leak | Authorized private export; public receipt omits invoice/preimage; kind 30078 publishes only `{commitment,receiptId}` with d tag | Public IDs, amount, hash/source/network, scope hash and timestamps remain linkable; no added commitment salt |
| XSS/malicious notes | React text rendering, strict schemas, bounded JSON and content-type checks | XSS/device compromise could steal customer sessionStorage keys and IndexedDB drafts; no upload endpoint exists |
| AI injection or unapproved spend | No call without explicit AI_ENABLED=true and key; strict draft fields, no financial tools, worker review, timeout/fallback | Secret-pattern filtering is incomplete; paid model quality/compatibility unvalidated |
| Offline replay or cross-account synchronization | Stable clientId, backend worker-scoped deduplication, owner session check before queue flush | Nonfinancial only; browser storage is not encrypted or guaranteed durable; no offline app-shell reload |
| Host loss or corrupted backup | Durable SQLite and generated installation keys provide backup inputs | Consistent encrypted backups/isolated restore drills are operator obligations, not completed evidence |

The pinned SDK 9.0.0 patch is included, reapplication tested and covered by 52 ESM/CJS tests. It validates envelopes/method correlation and cleans up request failure paths, without rewriting NIP-47. Do not skip install scripts. The audit has 3 low findings in bolt11/secp256k1/elliptic and no moderate/high/critical findings; do not force a weaker-major downgrade merely to suppress it.

Production should pin `APP_ORIGIN` to the browser-facing HTTPS origin. Without it, validation uses the direct Host header rather than Next's internal bind address; forwarded headers are not trusted. Restrict accepted hosts at the reverse proxy. CSP, no-referrer, no-sniff and frame-denial headers are implemented, but the CSP still permits inline scripts for Next.js; nonce-based CSP is future hardening. Runtime data and secret files are excluded from Next deployment tracing.

## Residual Risks

Receive-only NWC avoids granting spending through this app; it does not change custody of a hosted worker wallet or protect against that wallet/provider's compromise. Seed phrases and wallet spending keys are never requested. A server holding a receive credential can still see sensitive payment metadata and create invoices if compromised.

SQLite is not whole-disk encrypted by this design. NWC encryption does not protect plaintext job rows, WAL/journals, swap, logs, or exports. Use OS disk encryption, ACLs, encrypted backups, HTTPS, and a trusted host. Server-held encryption/signing keys cannot protect against a fully compromised running server.

An Ed25519 signature proves an issuer key signed bytes, not that its settlement report was honest. Public browser verification obtains the current issuer key from the same installation. The standalone private-bundle verifier checks exported scope, receipt/customer signatures and available payment evidence; independently pin its issuer key. Neither offline signature nor preimage/hash checks query a live wallet or guarantee payer identity or repair quality. Historical trust, managed rotation and compromise notices remain gaps.

With default `DB_PATH`, generated keys persist as `data/key` and `data/issuer-private.pem`; optional `APP_ENCRYPTION_KEY` must encode exactly 32 bytes as hex/base64. No receipt-key environment variables are supported. Losing/replacing keys can strand wallet connections and change issuer trust for historical receipts. Backup the matching data and keys securely; do not delete them to reset a shared instance.

Relay censorship, permanent metadata correlation, key loss, sessionStorage deletion, customer coercion, colluding parties, and inaccurate service descriptions remain possible. There is no extra commitment salt. Receipt-by-ID metadata remains public even if passport sharing is off; turning off sharing cannot retract a relay event. An accepted hold invoice can remain `PENDING` after local expiry until authoritative wallet terminal evidence. Mainnet is always disabled regardless of flags. No public deletion guarantee, production readiness, or external security audit is claimed.
