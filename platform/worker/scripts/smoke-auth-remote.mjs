// 僅供已授權的 Staging 驗收；建立一次性合成帳戶，結束後清除自己建立的資料。
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { digestToken, hashPassword } from '../src/credentials.js'

const exec = promisify(execFile)
const cwd = fileURLToPath(new URL('../', import.meta.url))
const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
const base = 'https://moducore-staging.takoson68.workers.dev'
const project = 'project-a'
const username = `m3_probe_${crypto.randomUUID().replaceAll('-', '')}`
const password = crypto.randomUUID() + crypto.randomUUID()
const hash = await hashPassword(password)
const userLimitKey = await digestToken(`user:${project}:${username}`)

async function remoteSQL(command) {
  try {
    const { stdout } = await exec(process.execPath, [cli, 'd1', 'execute', 'moducore-staging-db',
      '--remote', '--json', '--command', command], { cwd, maxBuffer: 1024 * 1024 })
    return JSON.parse(stdout)
  } catch {
    // 不將 CLI 參數、憑證或資料庫回傳寫入錯誤紀錄。
    throw new Error('Staging D1 驗收操作失敗；請個別確認連線與 Migration 狀態')
  }
}

async function request(path, { method = 'GET', token, body, projectId = project } = {}) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { 'X-Project': projectId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => null)
  return { response, data }
}

let seeded = false
try {
  await remoteSQL(`INSERT INTO users (tenant_id,username,password_hash,name,role,status)
    VALUES ('${project}','${username}','${hash}','M3 合成驗收','staff',1)`)
  seeded = true
  const start = performance.now()
  const login = await request('/api/login', { method: 'POST', body: { username, password } })
  if (login.response.status !== 200) console.error({ stage: 'login',
    status: login.response.status, code: login.data?.error?.code, traceId: login.data?.traceId })
  assert.equal(login.response.status, 200, '遠端登入應成功')
  assert.equal(login.data.success, true)
  assert.equal(login.data.user.tenant_id, project)
  assert.match(login.data.token, /^[a-f0-9]{64}$/)
  const token = login.data.token
  console.log(`遠端登入與原生密碼雜湊通過（含網路約 ${Math.round(performance.now() - start)} ms；非 CPU 用量）`)

  const stored = await remoteSQL(`SELECT t.token_hash,t.expires_at-t.created_at AS ttl
    FROM user_tokens t JOIN users u ON u.id=t.user_id
    WHERE u.username='${username}' AND u.tenant_id='${project}'`)
  assert.equal(stored[0].results[0].token_hash, await digestToken(token))
  assert.equal(stored[0].results[0].ttl, 28800)
  console.log('遠端 D1 僅保存 Token 雜湊及到期時間：通過')

  for (const path of ['/api/session', '/api/restore-session']) {
    const result = await request(path, { token })
    assert.equal(result.response.status, 200)
    assert.equal(result.data.authenticated, true)
  }
  console.log('Session 與還原：通過')
  assert.equal((await request('/api/session', { token, projectId: 'project-b' })).response.status, 403)
  assert.equal((await request(`/api/session?token=${token}`)).response.status, 400)
  console.log('跨專案與 Query Token 拒絕：通過')

  const invalid = await request('/api/login', { method: 'POST', body: { username, password: 'invalid-synthetic-password' } })
  assert.equal(invalid.response.status, 401)
  assert.equal(invalid.data.traceId, invalid.response.headers.get('x-trace-id'))
  assert.ok(!/SQL|stack|password_hash/i.test(JSON.stringify(invalid.data)))
  console.log('錯誤帳密與安全錯誤回應：通過')

  await remoteSQL(`UPDATE user_tokens SET created_at=1,expires_at=2 WHERE user_id=
    (SELECT id FROM users WHERE username='${username}' AND tenant_id='${project}')`)
  assert.equal((await request('/api/session', { token })).data.authenticated, false)
  console.log('Session 到期：通過')

  const again = await request('/api/login', { method: 'POST', body: { username, password } })
  assert.equal(again.response.status, 200)
  const logout = await request('/api/logout', { method: 'POST', token: again.data.token })
  assert.equal(logout.response.status, 200)
  assert.equal((await request('/api/session', { token: again.data.token })).data.authenticated, false)
  console.log('登出及持久撤銷：通過')
} finally {
  if (seeded) {
    await remoteSQL(`DELETE FROM users WHERE tenant_id='${project}' AND username='${username}';
      DELETE FROM auth_login_limits WHERE key_hash='${userLimitKey}'`)
    console.log('已清除本次合成帳戶及其 Token；其他資料未變動')
  }
}
