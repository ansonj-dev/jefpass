# JefPass

Your work. Your proof. A portable work passport prototype for independent repair technicians in Dakar: quote, customer acknowledgement, completion, and signed receipt, with Lightning evidence kept separate from service claims.

## Current Status

The Next.js app implements accounts, worker profiles, EN/FR job management, customer browser-key signatures, encrypted receive-only NWC connections, durable invoice reservations, reconciliation, private proof export, public receipt verification, and optional Nostr commitment signing/publication. IndexedDB supports nonfinancial drafts and idempotent job creation. Optional AI requires both `AI_ENABLED=true` and a server-side key; it is disabled by default even when a key is inherited.

**0 genuine wallet settlements. No user interviews, deployment, or public Git repository publication completed.** No wallet credentials or Docker/node wallet lab tools are available. External NIP-07 signing and relay publication have not been exercised. The unpaid job-to-receipt browser journey and offline reconnection were exercised against the real local backend.

| Evidence | Status |
| --- | --- |
| Local tests, typecheck, production build | Reported passing during development, including Next.js 16.4.6 build; final revision evidence below |
| External customer-wallet payment and preimage check | Blocked; 0 verified |
| Customer signatures, receipt export/verification | Implemented; fixture checks are not external wallet evidence |
| NIP-07 and relay publication | Implemented path; external signer/publication not exercised |
| EN/FR and offline drafts | Browser checked at 390px; one offline draft synchronized on reconnection without payment changes |
| Interviews, adoption, deployment | None evidenced; do not imply otherwise |

See [VERIFICATION.md](VERIFICATION.md) for exact commands, test counts, browser evidence and external blockers.

## Local Setup

Requires Node.js 24 with built-in `node:sqlite`, npm, persistent writable local disk, and one server process. This is not a serverless or multi-instance architecture. Docker is not required for the app.

1. Install Node 24 and confirm the selected runtime supports `node:sqlite`.
2. Optionally create a private `.env.local` from [.env.example](.env.example). Local database and durable installation keys work without supplied secrets. Keep the AI key empty.
3. Install once and start the app from the repository root:

```sh
npm install
npm run dev -- --port 3100
```

The current review server is at http://localhost:3100. Reuse it while running; otherwise use the URL printed by Next.js, choosing another port if occupied. The dev script binds all interfaces: restrict access with a firewall. Another customer's device needs a reachable trusted HTTPS origin, not its own `localhost`; browser cryptography requires a secure context.

The project pins `@getalby/sdk` 9.0.0 and applies a required `patch-package` npm `postinstall` patch for null response envelopes and method correlation. This is not a NIP-47 protocol rewrite. Use the committed lockfile with `npm ci` for reproducible installations. Do not skip install scripts or silently use an unpatched SDK.

Run checks separately:

```sh
npm test
npm run typecheck
npm run build
```

Keep the dev server and production build in separate processes only after stopping one or use different build directories. Do not expose the development server publicly. Pin `APP_ORIGIN` to the actual browser-facing HTTPS origin behind a reverse proxy; forwarded headers are deliberately not trusted.

For repeatable quoted-only sample data, register a dedicated account, set `DEMO_EMAIL` and `DEMO_PASSWORD` privately in your terminal, and run `npm run demo:seed`. The fixtures are labelled DEMO SEED and are idempotent per account. No acknowledgements, invoices or payments are seeded.

Export records from Profile, then run `npm run verify:bundle -- path/to/private-export.json`. This checks canonical receipt signatures, private scope, customer signatures and available invoice/amount/preimage evidence without this server. Set `TRUSTED_ISSUER_PUBLIC_KEY` to an independently obtained issuer SPKI base64 key for issuer pinning. Without a pin, valid signatures are self-contained consistency checks, not trusted identity or live wallet queries.

Do not spend limited API credits for this build. Leave `OPENAI_API_KEY` empty. AI is optional; no paid key was supplied and no provider call is required for setup or demo.

## Safety Contract

- `DB_PATH=./data/jefpass.sqlite`; optional `APP_ENCRYPTION_KEY` encodes exactly 32 bytes as hex or base64. Without it, a durable key is generated beside the database (default `data/key`). The generated Ed25519 issuer key persists as `data/issuer-private.pem` with the default path. There are no supported receipt-key environment variables.
- `LIGHTNING_NETWORK` defaults to `regtest`; `testnet` and `signet` require matching wallet `getInfo`. **Mainnet is always disabled regardless of flags.**
- `NWC_ALLOWED_RELAYS` is an exact comma-separated allowlist matching parsed target `URL.href`, including trailing slash. Empty fails closed. WSS and the operator allowlist are the controls; there is no separate private-address filter.
- Receive-only NWC through `@getalby/sdk` `NWCClient`: `get_info`, `make_invoice`, `lookup_invoice`; no spending methods.
- Invoice signature, exact integer millisatoshi amount, network, expiry, and payment hash must validate. `SETTLED` requires authoritative lookup and a matching preimage, not a UI label.
- Reserve invoice creation durably before network I/O. Ambiguity is `UNKNOWN`; never retry creation automatically, especially when the hash is missing.
- Receipts are Ed25519 **server issuer-signed**, not worker-signed unless a separately verified NIP-07 worker signature is attached. Customer signatures prove control of a browser key, not legal identity or repair quality.
- Full proof bundles are private exports. No raw invoice, preimage, customer data, or NWC URI on public pages or relays.
- Public browser verification checks canonical hash and Ed25519 signature against the current installation issuer key from `/api/session`. Server-signed payment claims are not an independent wallet query; authorized private exports include invoice/preimage evidence for independent checks.
- An accepted hold invoice remains `PENDING` after local expiry until an authoritative wallet terminal state; settlement still requires an exact matching preimage.
- Offline support is nonfinancial drafts and idempotent job creation, not offline payments. The manifest is an install hint; no service-worker offline app shell or guaranteed offline reload exists. Photos/uploads are deferred.

## Documentation

- [PROJECT_BRIEF.md](PROJECT_BRIEF.md): audience, scope, five judging criteria, evidence.
- [ARCHITECTURE.md](ARCHITECTURE.md): storage, state, trust boundaries, signing and backups.
- [INTEGRATIONS.md](INTEGRATIONS.md): genuine wallets, Nostr, optional AI, verification gates.
- [THREAT_MODEL.md](THREAT_MODEL.md): threats, controls to verify, residual trust.
- [DEMO_GUIDE.md](DEMO_GUIDE.md): three-minute run, UI sample, safe reset.
- [LIMITATIONS.md](LIMITATIONS.md): actual versus remaining work and blocked claims.
- [PUBLICATION_CHECKLIST.md](PUBLICATION_CHECKLIST.md): release, secrets, public-repo gates.

The MIT license is in [LICENSE](LICENSE). Open-source intent does not mean a public repository or deployment has already been published.
