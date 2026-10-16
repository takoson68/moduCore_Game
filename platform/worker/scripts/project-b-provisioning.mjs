import { hashPassword } from '../src/credentials.js'
import { deploymentTarget } from './deployment-targets.mjs'

// 首位管理員僅限此 tenant；不接受客戶端角色、DB ID 或 URL。
export async function adminStatement({ username, name, password, confirmation }) {
  const target = deploymentTarget('project-b-staging')
  if (typeof username !== 'string' || typeof name !== 'string') throw new Error('INVALID_IDENTITY')
  username = username.trim().toLowerCase()
  name = name.trim()
  if (!/^[a-z0-9][a-z0-9._@+-]{0,49}$/.test(username) || !name || name.length > 100 || /[\x00-\x1f\x7f]/.test(name)) {
    throw new Error('INVALID_IDENTITY')
  }
  if (typeof password !== 'string' || Array.from(password).length < 15 || password.length > 256 ||
      !password.trim() || /[\r\n\x00]/.test(password)) throw new Error('INVALID_PASSWORD')
  if (password !== confirmation) throw new Error('PASSWORD_MISMATCH')
  const hash = await hashPassword(password)
  return { target, sql: `INSERT INTO users
    (tenant_id,username,password_hash,name,role,company_id,status)
    SELECT ?,?,?,?,'super_admin','',1
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE tenant_id=? AND role='super_admin')
    RETURNING id`, params: [target.project, username, hash, name, target.project] }
}

// 單一條件 INSERT 在 D1 中原子執行；存在管理員或同名帳戶都不覆寫。
export async function provisionAdmin(execute, statement) {
  let result
  try { result = await execute(statement.sql, statement.params) }
  catch { throw new Error('PROVISION_FAILED') }
  if (!result?.success || result.meta?.changes !== 1 || result.results?.length !== 1) {
    throw new Error('ADMIN_EXISTS_OR_NO_INSERT')
  }
  return { id: Number(result.results[0].id), project: 'project-b', role: 'super_admin' }
}

// 離線測試與 CLI 均使用相同的固定 API；不傳出 SQL 參數或憑證的原始例外。
export function remoteExecutor({ accountId, token, fetcher = fetch }) {
  if (accountId !== '7cfb73ff5437f4b4438266632e7df5f7' || typeof token !== 'string' || !token.trim()) {
    throw new Error('REMOTE_CREDENTIALS_REQUIRED')
  }
  const target = deploymentTarget('project-b-staging')
  return async (sql, params) => {
    try {
      const response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${target.databaseId}/query`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params }),
      })
      const data = await response.json()
      if (!response.ok || !data.success || data.result?.length !== 1) throw new Error()
      return data.result[0]
    } catch { throw new Error('REMOTE_QUERY_FAILED') }
  }
}
