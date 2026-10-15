CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 50),
  username TEXT NOT NULL CHECK (length(username) BETWEEN 1 AND 50 AND username = lower(username)),
  password_hash TEXT NOT NULL CHECK (password_hash LIKE 'pbkdf2-sha256$600000$%'),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (length(role) > 0),
  company_id TEXT NOT NULL DEFAULT '',
  status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (tenant_id, username),
  UNIQUE (tenant_id, id)
);

CREATE TABLE user_tokens (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  revoked_at INTEGER,
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_user_tokens_user ON user_tokens (tenant_id, user_id);
CREATE INDEX idx_user_tokens_expiry ON user_tokens (expires_at);

CREATE TABLE auth_login_limits (
  key_hash TEXT PRIMARY KEY CHECK (length(key_hash) = 64),
  window_id INTEGER NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0)
);

CREATE INDEX idx_auth_login_limits_window ON auth_login_limits (window_id);
