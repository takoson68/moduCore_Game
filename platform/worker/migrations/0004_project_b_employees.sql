-- 員工資料不會建立登入帳戶，亦不回寫 users 的身份或權限。
CREATE TABLE IF NOT EXISTS project_b_employees (
  member_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL DEFAULT 'project-b' CHECK (tenant_id = 'project-b'),
  user_id INTEGER,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 64),
  title TEXT NOT NULL DEFAULT '' CHECK (length(title) <= 64),
  department TEXT NOT NULL DEFAULT '' CHECK (length(department) <= 64),
  email TEXT NOT NULL CHECK (length(trim(email)) BETWEEN 1 AND 255),
  phone TEXT NOT NULL DEFAULT '' CHECK (length(phone) <= 32),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager', 'super_admin')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (tenant_id, member_id),
  UNIQUE (tenant_id, user_id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_project_b_employees_status ON project_b_employees (tenant_id, status, member_id);
