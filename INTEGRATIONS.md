# Integrations

The NWC, Nostr, and optional AI adapters are implemented. **0 genuine wallet settlements** have been verified; wallet credentials and Bitcoin/Lightning lab tools are unavailable. External NIP-07 signing and relay publication have not been exercised. See [VERIFICATION.md](VERIFICATION.md) for the passing automated checks, real unpaid browser journey and explicit blockers. Fixture coverage is not live integration evidence.

## Genuine Wallet Setup

1. Provision a dedicated test-network receiving Lightning wallet with real NIP-47/NWC support. Separately provision and fund an external customer test wallet on the same actual network. Test coins are not mainnet funds; wallet/network compatibility must be demonstrated, not assumed.
2. Create a dedicated receiving delegation allowing only `get_info`, `make_invoice`, and `lookup_invoice`. Inspect wallet-reported capabilities with `@getalby/sdk` `NWCClient`; refuse spending permissions and missing required methods. Confirm exactly how the selected SDK maps these NIP-47 methods; method names here are protocol names, not invented TypeScript calls.
3. Set `NWC_ALLOWED_RELAYS` to comma-separated trusted `wss://` URLs from that wallet's actual configuration. Each parsed target's `URL.href` must exactly match an entry, including the trailing slash (for example `wss://relay.wallet-provider.example/` is a placeholder, not a reachable service). Empty fails closed; no default or wildcard exists. WSS and the operator allowlist are the controls: there is no separate private-address/DNS filter. Do not allow an internal destination merely because it uses WSS.
4. Enter the NWC URI only in authenticated worker wallet settings. Never put it in a repo, browser draft store, history, recording, screenshot, log, or public environment variable. The server persists it encrypted per worker with AES-256-GCM. A wallet secret is required and none has been supplied.
5. Confirm worker wallet identity, network, and exact invoice amount. Create one invoice after durable reservation, pay externally, and reconcile via `lookup_invoice` with mandatory preimage verification as specified in [ARCHITECTURE.md](ARCHITECTURE.md).
6. Revoke the demo delegation in the wallet after use. App disconnect must remove stored credentials; wallet-side revocation remains necessary if a credential was copied.

No wallet/node lab is available for this task. The app's Node 24 runtime does not itself provide a Lightning node or wallet. A genuine regtest demonstration still requires compatible NWC infrastructure and an external payer; no self-contained wallet lab is bundled. Do not introduce mock settlements as a substitute.

The pinned `@getalby/sdk` 9.0.0 uses a required npm `postinstall` `patch-package` patch for null envelopes, exact response method correlation and request cleanup. Patch reapplication and 52 ESM/CJS transport-stub tests passed. This repairs SDK validation, not the NIP-47 protocol. `npm ci` must run scripts; do not omit the patch. The dependency audit has 3 low findings in bolt11/secp256k1/elliptic and no moderate/high/critical findings. Do not force a weaker-major downgrade merely to change the count.

## Network Gate And Invoice Validation

`LIGHTNING_NETWORK` defaults to `regtest`; `signet` and `testnet` are supported configuration values requiring exact agreement with wallet `getInfo`. This does not certify interoperability with a particular wallet. BOLT11 prefixes alone cannot distinguish signet from testnet; both use `tb`. Do not relabel a testnet payment as proven signet evidence.

Mainnet is **always disabled** in this MVP, regardless of flags. There is no supported mainnet opt-in. Do not fund this prototype with mainnet money.

The adapter uses `bolt11` decoding/signature checks, exact safe-integer millisatoshis, configured network, expiry, and hash consistency. Lookup must identify the same incoming invoice and amount; `SETTLED` also requires a valid matching 32-byte preimage and settlement timestamp. No percentage tolerance applies. Unresolved creation is reserved durably before network I/O and becomes `UNKNOWN` on ambiguity; no automatic replacement is made, including when the hash is missing. Wallet changes/disconnect are blocked while operations remain unresolved.

An accepted hold invoice remains `PENDING` even after local expiry until an authoritative wallet terminal state. This unresolved limitation may keep a job/wallet blocked; local expiry is not cancellation. Late reconciliation still accepts valid settlement evidence for the original invoice and requires the exact preimage.

## Nostr And Private Proofs

`nostr-tools` constructs/verifies events. `/confirm/[token]` supports signed accept, acknowledge, and dispute. Links expire after seven days and only their hashes persist. Challenges/nonces expire after five minutes and are consumed atomically. Kind-27235 proofs bind action, job, and canonical scope hash; acceptance pins the browser public key. Secret keys live in `sessionStorage` keyed by `job.id`, not a global customer identity. Losing that session can prevent later acknowledgement; no customer account or key-recovery flow is implied.

External worker NIP-07 signing is optional. Do not import the worker's private Nostr key to the server. An Ed25519 issuer receipt is not a Nostr event or worker signature; attach a valid NIP-07 event before claiming the worker signed.

The worker browser signs and publishes kind 30078 with canonical sorted content `{commitment,receiptId}` and exactly `tags: [["d", receiptId]]`. The event is checked against the configured worker key, receipt content, and tag; acknowledged relay URLs are recorded with the attachment. No full receipt, invoice, preimage, or customer event is published, and no extra commitment salt is implemented. `NEXT_PUBLIC_NOSTR_RELAYS` is an optional comma list of PUBLIC browser-visible relays only; never put private wallet configuration or secrets there. External signer and relay publication remain unexercised.

Public `/verify/[id]` checks canonical SHA-256 and Ed25519 in the browser against this installation's `/api/session` key. Public payment evidence is an issuer-signed claim, not a live independent wallet query. Authorized `/api/export` contains invoice/preimage, customer signatures and worker attachments. The standalone `npm run verify:bundle -- path/to/private-export.json` checks available cryptographic evidence outside the database; pin `TRUSTED_ISSUER_PUBLIC_KEY` independently for issuer trust. Receipt IDs expose metadata even when a job is not on the public passport.

## Offline And AI

`idb-keyval` stores worker-scoped drafts and queued nonfinancial creation with a stable `clientId`. Backend worker-scoped deduplication prevents duplicate jobs on identical retry and rejects reuse with changed terms. Flush checks the authenticated owner. No offline invoice creation, acknowledgement replay queue, payment action, or fabricated settled badge exists. There is no service-worker offline app shell or complete offline reload PWA; the manifest is an install hint. Optional photos are deferred, with no upload endpoint.

Authenticated `POST /api/ai/draft` accepts strict `{text,language}` input. Both `AI_ENABLED=true` and server-only `OPENAI_API_KEY` are required to call a provider; the default is a local non-AI fallback even with an inherited key. `OPENAI_MODEL` defaults to `gpt-4.1-mini`. Strict title/description/category output is validated with Zod; errors/timeouts fall back locally. It cannot set amount, sign, certify work, change payment state, or spend. Known secret-pattern rejection is not comprehensive redaction. The fallback was exercised in the browser; provider quality, cost and live compatibility remain unverified. Keep AI disabled for the budget-constrained demo.

## Lead Evidence Register

| Check | Evidence boundary |
| --- | --- |
| Revision, Node version, SDK patch, commands and exact count | See [VERIFICATION.md](VERIFICATION.md) |
| Wallet product/version, network, permissions, reviewed relay allowlist | External validation blocked; no credentials/lab |
| External payer and receiving-wallet lookup agree | 0 genuine wallet settlements |
| Invoice, preimage, reservation, authorization and signature checks | Implemented with fixture tests; final results in VERIFICATION.md |
| External NIP-07 and relay acknowledgement | Not exercised; no external signer available |
| EN/FR, mobile, privacy and offline browser checks | Local browser journey and 390px overflow checks passed; not a physical-device usability certification |
| Optional AI | Strict-schema tests and real local fallback checked; paid provider unvalidated |

Keep sensitive evidence private. A public report can name the network, revision, redacted result, and method without publishing raw invoices/preimages or credentials.
