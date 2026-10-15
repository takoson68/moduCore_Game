-- SQLite 無法直接修改 CHECK；先複製父子資料，再於 Migration 交易內替換，保留身份與 Session。
CREATE TABLE users_v3 (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 50),
  username TEXT NOT NULL CHECK (length(username) BETWEEN 1 AND 50 AND username = lower(username)),
  password_hash TEXT NOT NULL CHECK (password_hash LIKE 'pbkdf2-sha256$600000$%' OR password_hash LIKE 'scrypt$16384$8$5$%'),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (length(role) > 0),
  company_id TEXT NOT NULL DEFAULT '',
  status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (tenant_id, username),
  UNIQUE (tenant_id, id)
);
INSERT INTO users_v3 SELECT * FROM users;
CREATE TABLE user_tokens_v3 (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  revoked_at INTEGER,
  FOREIGN KEY (tenant_id, user_id) REFERENCES users_v3 (tenant_id, id) ON DELETE CASCADE
);
INSERT INTO user_tokens_v3 SELECT * FROM user_tokens;
DROP TABLE user_tokens;
DROP TABLE users;
ALTER TABLE users_v3 RENAME TO users;
ALTER TABLE user_tokens_v3 RENAME TO user_tokens;
CREATE INDEX idx_user_tokens_user ON user_tokens (tenant_id, user_id);
CREATE INDEX idx_user_tokens_expiry ON user_tokens (expires_at);
