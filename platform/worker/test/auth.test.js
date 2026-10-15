import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { digestToken, hashPassword } from '../src/credentials.js'
import { requireSession } from '../src/auth.js'

let mf, db, password
const project = 'project-b'
const base = 'https://example.test'
const sql = (text, ...values) => db.prepare(text).bind(...values)
const modules = ['index.js', 'auth.js', 'credentials.js', 'response.js'].map(name => ({
  type: 'ESModule', path: fileURLToPath(new URL(`../src/${name}`, import.meta.url)),
}))

before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({
    modules,
    compatibilityDate: '2026-10-15',
    compatibilityFlags: ['nodejs_compat'],
    bindings: { PROJECT_ID: project },
    d1Databases: ['DB'],
  }))
  db = await mf.getD1Database('DB')
  const dir = new URL('../migrations/', import.meta.url)
  for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) {
    const statements = (await readFile(new URL(file, dir), 'utf8')).split(';').map(s => s.trim()).filter(Boolean)
    await db.batch(statements.map(s => db.prepare(s)))
  }
  password = `test-${crypto.randomUUID()}`
  const hash = await hashPassword(password)
  for (const [id, tenant, username, role, status] of [
    [1, project, 'admin', 'super_admin', 1],
    [2, project, 'staff', 'staff', 1],
    [3, 'project-a', 'foreign', 'super_admin', 1],
    [4, project, 'disabled', 'staff', 0],
  ]) {
    await sql(`INSERT INTO users (id, tenant_id, username, password_hash, name, role, company_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, id, tenant, username, hash, '合成測試使用者', role, '', status).run()
  }
})

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM user_tokens'), db.prepare('DELETE FROM auth_login_limits')])
})
after(async () => { await mf?.dispose() })

function request(path, { method = 'GET', body, token, headers = {} } = {}) {
  return mf.dispatchFetch(`${base}${path}`, {
    method,
    headers: { 'X-Project': project, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}
async function signIn(username = 'admin') {
  const response = await request('/api/login', { method: 'POST', body: { username, password } })
  assert.equal(response.status, 200)
  return response.json()
}

test('D1 登入保存安全雜湊，回傳既有身份欄位與隨機 Token', async () => {
  const login = await signIn()
  assert.equal(login.success, true)
  assert.match(login.token, /^[a-f0-9]{64}$/)
  assert.deepEqual(login.user, { id: 1, tenant_id: project, username: 'admin',
    name: '合成測試使用者', role: 'super_admin', company_id: '', is_super_admin: true })
  const saved = await db.prepare('SELECT * FROM user_tokens').first()
  assert.equal(saved.token_hash, await digestToken(login.token))
  assert.notEqual(saved.token_hash, login.token)
  assert.equal(saved.expires_at - saved.created_at, 28800)
  const user = await db.prepare('SELECT * FROM users WHERE id = 1').first()
  assert.match(user.password_hash, /^pbkdf2-sha256\$600000\$/)
  assert.ok(!JSON.stringify(user).includes(password))
})

test('錯誤密碼、停用帳戶、未知帳號及 SQL 注入都無法登入', async () => {
  for (const username of ['admin', 'disabled', 'missing', "admin' OR 1=1 --"]) {
    const response = await request('/api/login', { method: 'POST', body: {
      username, password: username === 'disabled' ? password : 'wrong-password',
    } })
    assert.equal(response.status, 401)
    assert.equal((await response.json()).message, '帳號或密碼錯誤')
  }
  assert.equal((await db.prepare('SELECT count(*) AS n FROM user_tokens').first()).n, 0)
})

test('Tenant 固定綁定且外專案帳號不能登入', async () => {
  const missing = await request('/api/session', { headers: { 'X-Project': '' } })
  assert.equal(missing.status, 400)
  const mismatch = await request('/api/login', { method: 'POST', headers: { 'X-Project': 'project-a' },
    body: { username: 'foreign', password } })
  assert.equal(mismatch.status, 403)
  const foreign = await request('/api/login', { method: 'POST', body: { username: 'foreign', password } })
  assert.equal(foreign.status, 401)
})

test('Session 及還原別名使用 Bearer；登出可重跑且撤銷持久 Token', async () => {
  const login = await signIn()
  for (const path of ['/api/session', '/api/restore-session', '/api/session/']) {
    const response = await request(path, { token: login.token })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).authenticated, true)
  }
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(await (await request('/api/logout', { method: 'POST', token: login.token })).json(), { success: true })
  }
  const result = await (await request('/api/session', { token: login.token })).json()
  assert.deepEqual(result, { success: true, authenticated: false, user: null, token: null })
})

test('Session 拒絕過期、停用及跨 Tenant Token', async () => {
  const login = await signIn()
  await db.prepare('UPDATE user_tokens SET created_at = 1, expires_at = 2').run()
  assert.equal((await (await request('/api/session', { token: login.token })).json()).authenticated, false)
  const now = Math.floor(Date.now() / 1000)
  await sql('UPDATE user_tokens SET created_at = ?, expires_at = ?', now, now + 60).run()
  await db.prepare('UPDATE users SET status = 0 WHERE id = 1').run()
  assert.equal((await (await request('/api/session', { token: login.token })).json()).authenticated, false)
  await db.prepare('UPDATE users SET status = 1 WHERE id = 1').run()
  await db.prepare("UPDATE user_tokens SET tenant_id = 'project-a', user_id = 3").run()
  assert.equal((await (await request('/api/session', { token: login.token })).json()).authenticated, false)
  await request('/api/logout', { method: 'POST', token: login.token })
  assert.equal((await db.prepare('SELECT revoked_at FROM user_tokens').first()).revoked_at, null)
})

test('Query Token 與錯誤 Authorization 格式被拒絕', async () => {
  const login = await signIn()
  assert.equal((await request(`/api/session?token=${login.token}`, { token: login.token })).status, 400)
  assert.equal((await request('/api/session', { headers: { Authorization: 'Bearer malformed' } })).status, 400)
  const anonymous = await (await request('/api/session')).json()
  assert.equal(anonymous.authenticated, false)
})

test('權限 helper 依實際 Session 區分未登入、角色不足與允許', async () => {
  const env = { DB: db, PROJECT_ID: project }
  await assert.rejects(() => requireSession(new Request(`${base}/api/private`, {
    headers: { 'X-Project': project },
  }), env), error => error.status === 401)
  const staff = await signIn('staff')
  const req = new Request(`${base}/api/private`, { headers: {
    'X-Project': project, Authorization: `Bearer ${staff.token}`,
  } })
  await assert.rejects(() => requireSession(req, env, ['super_admin']), error => error.status === 403)
  assert.equal((await requireSession(req, env, ['staff'])).id, 2)
})

test('JSON、欄位型別與請求大小驗證；所有 API 錯誤均帶 Trace ID', async () => {
  for (const [body, status] of [['{', 400], [[], 400], [{ username: 1, password }, 400],
    [{ username: 'admin', password: 'x'.repeat(5000) }, 413]]) {
    const response = await request('/api/login', { method: 'POST', body })
    assert.equal(response.status, status)
    const data = await response.json()
    assert.equal(data.traceId, response.headers.get('x-trace-id'))
    assert.equal(data.success, false)
  }
  assert.equal((await request('/api/login', { method: 'POST', body: '{}', headers: {
    'Content-Type': 'text/plain',
  } })).status, 415)
  assert.equal((await request('/api/login')).status, 405)
  assert.equal((await request('/api')).status, 404)
})

test('持久登入頻率限制在密碼運算前拒絕超額嘗試', async () => {
  const key = await digestToken(`user:${project}:admin`)
  await sql('INSERT INTO auth_login_limits VALUES (?, ?, ?)', key,
    Math.floor(Date.now() / 1000 / 900), 10).run()
  assert.equal((await request('/api/login', { method: 'POST', body: { username: 'admin', password } })).status, 429)
})

test('SQLite 約束與 D1 batch 失敗可回復整批寫入', async () => {
  const statements = [
    db.prepare("UPDATE users SET name = '不應保存' WHERE id = 1"),
    db.prepare('INSERT INTO user_tokens (tenant_id,user_id,token_hash,created_at,expires_at) VALUES (\'project-b\',999,\'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\',1,2)'),
  ]
  await assert.rejects(() => db.batch(statements))
  assert.equal((await db.prepare('SELECT name FROM users WHERE id = 1').first()).name, '合成測試使用者')
  assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0)
})

test('Migration 批次失敗時，新建的資料表也會回復', async () => {
  await assert.rejects(() => db.batch([
    db.prepare('CREATE TABLE m3_failed_migration_probe (id INTEGER PRIMARY KEY)'),
    db.prepare('INSERT INTO m3_failed_migration_probe (missing_column) VALUES (1)'),
  ]))
  const table = await db.prepare("SELECT name FROM sqlite_master WHERE name = 'm3_failed_migration_probe'").first()
  assert.equal(table, null)
})

test('未完成 Migration 的 D1 錯誤不洩漏內部資料', async () => {
  const empty = new Miniflare(convertV4MiniflareOptions({ modules,
    compatibilityDate: '2026-10-15', compatibilityFlags: ['nodejs_compat'],
    bindings: { PROJECT_ID: project }, d1Databases: ['DB'],
  }))
  try {
    const response = await empty.dispatchFetch(`${base}/api/session`, { headers: {
      'X-Project': project, Authorization: `Bearer ${'a'.repeat(64)}`,
    } })
    assert.equal(response.status, 500)
    const body = await response.text()
    assert.ok(!/SELECT|SQLITE|user_tokens|Stack|\/Users\//.test(body))
    assert.equal(JSON.parse(body).error.code, 'INTERNAL_ERROR')
  } finally { await empty.dispose() }
})
