# JëfPass on Appwrite

This guide describes the live Appwrite demo configuration. It is not a production security certification.

## Appwrite resources

The JëfPass Site runs as a Next.js SSR Site in the existing Appwrite project. Its persistent database is:

- **Database:** `jefpass-db` — JëfPass Database (TablesDB, serverless)
- **Table:** `records` — Application Records
- **Table:** `secrets` — Application Secrets

Both tables have row security disabled and no public table permissions. Access is server-side through the Appwrite Site's request-scoped API key.

### `records` table

| Column | Type | Meaning |
|---|---|---|
| `record_type` | varchar(32) | `document` or `rate_limit` |
| `record_key` | varchar(128) | Kind/ID pair or rate-limit key |
| `payload` | mediumtext | JSON value or rate-limit counter |

A unique index covers `record_type` and `record_key`.

Existing application documents are mapped as one row per SQLite document:

- `record_type=document`
- `record_key=<kind>:<id>`
- `payload=<serialized JSON document>`

Rate limits use `record_type=rate_limit`, with the rate-limit identifier as the key and its count/reset timestamp in the JSON payload. The Appwrite row ID is a stable hash of the record type and key.

This preserves the existing entities used by the local application: accounts, workers, sessions, jobs, job-client idempotency records, customer proof state, receipts, Nostr attachments, wallet metadata and rate-limit counters.

### `secrets` table

| Column | Type | Meaning |
|---|---|---|
| `secret_name` | varchar(64) | Stable key name |
| `secret_value` | mediumtext | Base64-encoded secret bytes |

The adapter initializes and reuses two persistent keys:

- `key`: AES-256-GCM key used to encrypt worker NWC connection URIs.
- `issuer-private.pem`: Ed25519 issuer private key used to sign receipts.

A unique index covers `secret_name`. Do not grant public access to this table or expose its contents in an API response.

## How the app keeps local behavior

Local development continues to use the normal on-disk SQLite database at `data/jefpass.sqlite`. The application code still uses its existing synchronous database helpers and transaction callbacks.

On an Appwrite Site request:

1. Appwrite injects the Site ID, project ID, regional API endpoint and a short-lived server API key in the `x-appwrite-key` request header.
2. The API adapter uses this key from the current request only. It does not store a long-lived Appwrite API key in Site variables or browser code.
3. The adapter starts an Appwrite TablesDB transaction and loads the `records` rows into a request-isolated in-memory SQLite database.
4. Existing synchronous account, session, job, customer, wallet, receipt and rate-limit functions run against that database view.
5. The adapter compares the request's final SQLite state with the loaded snapshot, stages the changed rows and commits them in the same Appwrite transaction.
6. The temporary in-memory SQLite database and request-scoped key reference are discarded after the response.

If Appwrite is not configured or its request-scoped key is missing, the hosted adapter fails closed with a service-unavailable response. It never silently falls back to a new local SQLite file.

## Required Site configuration

The Appwrite Site needs the following environment variables:

| Variable | Value |
|---|---|
| `APP_ORIGIN` | Exact HTTPS URL of the JëfPass Site |
| `APPWRITE_DATABASE_ID` | `jefpass-db` |
| `APPWRITE_TABLE_ID` | `records` |
| `APPWRITE_SECRETS_TABLE_ID` | `secrets` |
| `LIGHTNING_NETWORK` | `regtest` for the demo |
| `AI_ENABLED` | `false` unless an operator intentionally enables it |

Appwrite injects `APPWRITE_SITE_ID`, `APPWRITE_SITE_PROJECT_ID` and `APPWRITE_SITE_API_ENDPOINT` for Site SSR execution. The `x-appwrite-key` request header carries the short-lived API key. Do not copy that header value into persistent variables.

The Site's generated API-key scopes must include:

- `project.read`
- `tables.read`
- `tables.write`

Do not add public permissions to either JëfPass table.

## Important boundaries

- The adapter is a compatibility layer designed to keep the current synchronous service logic working while making Appwrite TablesDB the durable store.
- It currently loads the records table for each API request. This is appropriate for a small prototype dataset, not a high-scale database access pattern. A larger deployment should move to filtered, direct TablesDB queries in the service layer.
- Reads are paginated 100 rows at a time to stay within the TablesDB `listRows` query limit.
- Appwrite's Free plan supports up to 100 operations in one transaction. JëfPass fails a larger write closed rather than splitting one logical mutation into partial commits.
- A record payload is limited to 60 KB by the adapter to stay below the table row size limit.
- A pre-existing local `data/jefpass.sqlite` file is not automatically imported. An explicit migration/export/import is needed to move development records into Appwrite.
- The NWC relay allowlist remains empty unless configured by the operator, so wallet connection fails closed. The demo stays on regtest and mainnet remains disabled.
- This database integration does not prove external Lightning settlement, customer identity or repair quality. Test wallet interoperability separately before making those claims.
