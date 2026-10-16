// 僅在另行授權發布後執行，固定 project-b Staging，所有資料均為一次性合成 fixture。
import { deploymentTarget } from './deployment-targets.mjs'
import { remoteExecutor } from './project-b-provisioning.mjs'
import { digestToken, hashPassword } from '../src/credentials.js'
import { verifyEmployeeSmoke } from './employee-smoke-contract.mjs'

const target = deploymentTarget('project-b-staging')

// 不輸出憑證、Token、SQL 或底層例外；未給明確執行旗標不連線遠端。
async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--execute-staging') {
    throw new Error('需明確指定 --execute-staging，僅供已授權發布驗收')
  }
  const execute = remoteExecutor({ accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN })
  const marker = `m4_${crypto.randomUUID().replaceAll('-', '')}`
  const email = `${marker}@example.invalid`
  const ownEmail = `${marker}_self@example.invalid`
  const password = crypto.randomUUID() + crypto.randomUUID()
  const hash = await hashPassword(password)
  const usernames = ['super_admin', 'manager', 'staff'].map(role => `${marker}_${role}`)
  const limitKeys = await Promise.all(usernames.map(name => digestToken(`user:project-b:${name}`)))
  const sql = async (query, params = []) => {
    const result = await execute(query, params)
    if (!result?.success) throw new Error('驗收資料操作失敗')
    return result.results
  }
  // 請求有時限，清理會在任意驗收失敗後執行。
  const api = async (path, token, body, project = 'project-b') => {
    const response = await fetch(`${target.base}/api/${path}`, { signal: AbortSignal.timeout(15000),
      method: body === undefined ? 'GET' : 'POST', headers: { 'X-Project': project,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) })
    return { status: response.status, data: await response.json() }
  }
  try {
    const ids = {}, tokens = {}
    for (const [i, role] of ['super_admin', 'manager', 'staff'].entries()) {
      const rows = await sql(`INSERT INTO users (tenant_id,username,password_hash,name,role)
        VALUES ('project-b',?,?,?,?) RETURNING id`, [usernames[i], hash, 'M4 合成驗收', role])
      ids[role] = rows[0].id
      const login = await api('login', null, { username: usernames[i], password })
      if (login.status !== 200 || !login.data.token) throw new Error('合成登入失敗')
      tokens[role] = login.data.token
    }
    const own = await sql(`INSERT INTO project_b_employees (name,email,user_id)
      VALUES ('M4 合成本人',?,?) RETURNING member_id`, [ownEmail, ids.staff])
    const result = await verifyEmployeeSmoke((action, token, body) => api(`employees/${action}`, token, body),
      { tokens, staffMemberId: own[0].member_id, email })
    const mismatch = await api('employees/list', tokens.super_admin, undefined, 'dineCore')
    if (mismatch.status !== 403) throw new Error('跨專案識別未拒絕')
    console.log(`Employee Staging 契約通過；刪除結果=${result.deletion}`)
  } finally {
    // 僅精確刪除本次 UUID 標記資料，先移除 FK 子資料再刪合成帳戶。
    await sql('DELETE FROM project_b_employees WHERE tenant_id=? AND email IN (?,?)', ['project-b', email, ownEmail])
    await sql('DELETE FROM users WHERE tenant_id=? AND username IN (?,?,?)', ['project-b', ...usernames])
    await sql('DELETE FROM auth_login_limits WHERE key_hash IN (?,?,?)', limitKeys)
    const left = await sql('SELECT COUNT(*) AS n FROM project_b_employees WHERE email IN (?,?)', [email, ownEmail])
    const usersLeft = await sql('SELECT COUNT(*) AS n FROM users WHERE username IN (?,?,?)', usernames)
    if (left[0].n || usersLeft[0].n) throw new Error('合成資料清理不完整')
    console.log('本次合成員工／帳戶已清除；Token 依既有 FK 串刪')
  }
}

if (process.argv.length !== 3 || process.argv[2] !== '--execute-staging') {
  console.error('未提供 --execute-staging，未連線遠端、未建立驗收資料')
  process.exitCode = 1
} else {
  main().catch(() => { console.error('Employee Staging 驗收失敗；請確認部署、Migration 與合成資料清理狀態'); process.exitCode = 1 })
}
