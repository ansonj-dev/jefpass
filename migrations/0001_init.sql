CREATE TABLE IF NOT EXISTS documents (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  body TEXT NOT NULL CHECK (json_valid(body)),
  PRIMARY KEY (kind, id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_secrets (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
