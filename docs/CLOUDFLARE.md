# JëfPass on Cloudflare Workers and D1

JëfPass uses Cloudflare Workers as its hosted runtime and the D1 database jefpass-db as its durable store. The Appwrite deployment has been retired.

## Cloudflare resources

- Worker: jefpass
- D1 database: jefpass-db
- D1 database ID: 162b1629-d063-4d11-ac7a-ffdc8e3b743d
- D1 binding name: DB
- Region: APAC (as configured when the database was created)

The binding is declared in wrangler.jsonc. The wrapper in worker.js exposes the binding to the Next.js request runtime before delegating to the generated OpenNext worker.

## Why there is a compatibility layer

The existing service code uses Node's synchronous SQLite API (prepare().get(), all(), run() and synchronous transaction callbacks). Cloudflare Workers exposes node:sqlite as a non-functional stub and has no persistent local SQLite filesystem.

To preserve the established service behavior without invoking that stub:

1. Local development continues to use the real Node.js 24 DatabaseSync file database.
2. On Cloudflare, worker.js exposes the Worker's private D1 binding to the application runtime.
3. Each API request reads the D1 documents and rate_limits tables into a request-scoped in-memory compatibility database.
4. Existing synchronous account, session, job, customer, wallet, receipt and rate-limit logic runs against that compatibility database.
5. The adapter queues each SQL mutation as a prepared D1 statement and commits the request's writes atomically through DB.batch().
6. The temporary in-memory view is discarded when the response finishes.

The compatibility adapter intentionally supports only the SQL statements used by the current service layer. When adding or changing a query, add its matching operation and tests in lib/db.ts and tests/cloudflare-d1.test.ts.

## D1 schema

The Worker ensures the tables exist before handling its first D1 request. The same schema is version-controlled in migrations/0001_init.sql.

### documents

| Column | Type | Meaning |
|---|---|---|
| kind | TEXT | Document type, such as accounts, workers, jobs, sessions, receipts |
| id | TEXT | Document identifier |
| body | TEXT | JSON-encoded application document |

The primary key is (kind, id). This preserves the existing SQLite document model.

### rate_limits

| Column | Type | Meaning |
|---|---|---|
| id | TEXT | Rate-limit key |
| count | INTEGER | Current counter |
| reset_at | INTEGER | Unix timestamp in milliseconds |

### app_secrets

| Column | Type | Meaning |
|---|---|---|
| name | TEXT | Stable secret name |
| value | TEXT | Base64-encoded secret bytes |

The table stores the application AES-256-GCM encryption key (when APP_ENCRYPTION_KEY is not configured as a Worker secret) and the Ed25519 receipt issuer private key. Do not add public D1 access or expose these rows through an API.

## Environment and bindings

The wrangler.jsonc file contains:

- DB: the D1 database binding.
- JEFPASS_CLOUDFLARE=true: fail-closed mode if the binding is missing.
- LIGHTNING_NETWORK=regtest: safe demo default.
- AI_ENABLED=true, AI_BASE_URL and AI_MODEL: the "Help write scope" assistant (Fireworks by default). The provider key is a separate secret.
- OpenNext static assets and image bindings.
- WORKER_SELF_REFERENCE: the service binding used by OpenNext.

Set these Worker variables/secrets through Cloudflare:

| Name | Type | Purpose |
|---|---|---|
| APP_ORIGIN | Variable | Exact HTTPS application origin |
| APP_ENCRYPTION_KEY | Optional secret | Optional 32-byte key as 64 hex characters or base64; omit to use the D1-backed persistent key |
| NWC_ALLOWED_RELAYS | Variable | Exact allowlisted WSS relay URLs |
| AI_API_KEY | Secret | AI provider bearer token (e.g. Fireworks key). Legacy alias: OPENAI_API_KEY |
| AI_ENABLED | Variable | true to enable the draft assistant; a key alone does nothing |
| AI_BASE_URL | Variable | OpenAI-compatible endpoint, e.g. https://api.fireworks.ai/inference/v1 |
| AI_MODEL | Variable | Model id, e.g. accounts/fireworks/models/llama-v3p1-8b-instruct |
| LIGHTNING_NETWORK | Variable | regtest for the demo |

keep_vars is enabled so existing dashboard variables are retained when Wrangler deploys. Confirm APP_ORIGIN matches the actual production domain and remains HTTPS.

## Commands

Run from the repository root:

```bash
npm run cf:build
npm run cf:migrate
npm run cf:preview
npm run cf:deploy
```

The scripts use pinned OpenNext and Wrangler CLI versions through npx. The application also bootstraps the three tables on the first API request, so the first request can create the schema if migrations have not yet been applied. Prefer applying migrations before a production release.

## Persistence behavior and limitations

- Registration, login, sessions, workers, jobs, customer proof, receipts, wallet metadata and rate-limit counters persist in D1.
- System encryption/signing keys persist in app_secrets and are reused across Worker isolates.
- DB.batch() makes a request's queued mutations atomic. The adapter does not split a logical request into partial batches; requests with more than 100 queued statements fail closed.
- Each API request currently loads every row in documents and rate_limits. This is a prototype compatibility approach, not a scale-ready query architecture. Replace it with direct, filtered D1 queries before growing the dataset.
- A request uses a hydrated snapshot, not a D1 read transaction. Concurrent writes to the same existing document can therefore be last-commit-wins. Only the unique account insert race is explicitly converted to a registration conflict today. Add optimistic version checks or conditional D1 updates before relying on this adapter for concurrent production workloads.
- The current D1 database was created empty. The old Appwrite Site has been deleted, and existing local data/jefpass.sqlite files are not imported automatically.
- If the original receipt issuer or encryption keys existed only in the old Appwrite database, they are not recoverable from the new empty D1 database. The first request will create new keys. Previously issued receipt signatures cannot be verified as trusted by the new issuer key unless the old public key is retained separately.
- This project is a prototype, not a production-certified payment service or independent security audit.

## Deployment verification

After deployment, test these actions in order:

1. Open the landing page and /api/session.
2. Register a new account.
3. Refresh and confirm the session persists.
4. Log out, then log in with the same credentials.
5. Open the D1 console and confirm rows appear in documents and app_secrets.
6. Restart or redeploy the Worker and confirm the same account and session still work.

Never inspect or paste password hashes, session tokens, NWC URIs, encrypted wallet blobs or secret values into logs or chat.
