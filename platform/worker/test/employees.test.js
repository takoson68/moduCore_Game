import assert from 'node:assert/strict'
import { before, beforeEach, after, test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import worker from '../src/index.js'
import { digestToken } from '../src/credentials.js'
import { verifyEmployeeSmoke } from '../scripts/employee-smoke-contract.mjs'

let mf, db
const tokens = { super_admin: 'a'.repeat(64), manager: 'b'.repeat(64), staff: 'c'.repeat(64), foreign: 'd'.repeat(64) }
before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("local")}}',
    compatibilityDate: '2026-10-15', d1Databases: ['DB'] }))
  db = await mf.getD1Database('DB')
  for (const name of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    await db.batch((await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8')).split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)))
  }
  for (const [index, role] of Object.keys(tokens).entries()) {
    const tenant = role === 'foreign' ? 'dineCore' : 'project-b'
    await db.prepare('INSERT INTO users (id,tenant_id,username,password_hash,name,role) VALUES (?,?,?,?,?,?)')
      .bind(index + 1, tenant, `fixture-${index}`, 'scrypt$16384$8$5$schema-only', '合成身份', role === 'foreign' ? 'super_admin' : role).run()
    await db.prepare('INSERT INTO user_tokens (tenant_id,user_id,token_hash,created_at,expires_at) VALUES (?,?,?,?,?)')
      .bind(tenant, index + 1, await digestToken(tokens[role]), 1, 9999999999).run()
  }
})
beforeEach(async () => {
  await db.prepare('DROP TABLE IF EXISTS project_b_history_probe').run()
  await db.prepare('DELETE FROM project_b_employees').run()
  await db.prepare('UPDATE users SET status=1').run()
})
after(async () => { await mf?.dispose() })

// 走實際 Worker 路由及 Session 驗證，資料庫使用一次性 D1。
async function call(action, role = 'super_admin', body, project = 'project-b') {
  return worker.fetch(new Request(`https://local.test/api/employees/${action}`, {
    method: action === 'list' ? 'GET' : 'POST',
    headers: { 'X-Project': project, 'Content-Type': 'application/json', ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), { DB: db, PROJECT_ID: project })
}

// 測試專用：刻意讓員工 ID 與帳戶 ID 不同，避免錯誤測試掩蓋身份混淆。
async function fixture(memberId, role = 'staff', userId = null) {
  await db.prepare('INSERT INTO project_b_employees (member_id,name,email,role,user_id) VALUES (?,?,?,?,?)')
    .bind(memberId, '合成員工', 'fixture@example.invalid', role, userId).run()
}

test('員工 CRUD 保留回應形狀、無帳戶副作用且回應不含機密', async () => {
  const users = (await db.prepare('SELECT * FROM users').all()).results
  const created = await call('create', 'super_admin', { name: '員工一', email: 'one@example.invalid' })
  assert.equal(created.status, 200)
  const row = await created.json()
  assert.equal(row.id, row.member_id)
  assert.equal(row.user_id, null)
  assert.equal(row.username, '')
  assert.ok(!/password|token_hash/.test(JSON.stringify(row)))
  const changed = await call('update', 'super_admin', { id: row.id, phone: '0900', status: 'inactive' })
  assert.equal(changed.status, 200)
  assert.equal((await changed.json()).phone, '0900')
  assert.equal((await (await call('list')).json()).length, 1)
  assert.deepEqual(await (await call('delete', 'super_admin', { id: row.id })).json(), { success: true })
  assert.deepEqual((await db.prepare('SELECT * FROM users').all()).results, users)
})

test('Staging 共用 Employee Smoke 契約先在一次性 D1 通過', async () => {
  await fixture(501, 'staff', 3)
  const adapter = async (action, token, body) => {
    const role = Object.keys(tokens).find(key => tokens[key] === token) || 'anonymous'
    const response = await call(action, role, body)
    return { status: response.status, data: await response.json() }
  }
  const result = await verifyEmployeeSmoke(adapter, { tokens, staffMemberId: 501, email: 'probe@example.invalid' })
  assert.equal(result.deletion, 'deleted')
})

test('未登入、跨專案 Token 及其他專案均無法操作員工', async () => {
  assert.equal((await call('list', 'anonymous')).status, 401)
  assert.equal((await call('list', 'foreign')).status, 401)
  assert.equal((await call('list', 'foreign', undefined, 'dineCore')).status, 404)
  await db.prepare('UPDATE users SET status=0 WHERE id=3').run()
  assert.equal((await call('list', 'staff')).status, 401)
})

test('主管可看清單、管理一般員工，不可提升角色、操作主管或刪除', async () => {
  await fixture(101)
  await fixture(102, 'manager')
  await fixture(103, 'staff', 1)
  assert.equal((await (await call('list', 'manager')).json()).length, 3)
  assert.equal((await call('create', 'manager', { name: '一般', email: 'staff@example.invalid' })).status, 200)
  assert.equal((await call('create', 'manager', { name: '主管', email: 'manager@example.invalid', role: 'manager' })).status, 403)
  assert.equal((await call('update', 'manager', { id: 101, phone: '123' })).status, 200)
  assert.equal((await call('update', 'manager', { id: 101, role: 'super_admin' })).status, 403)
  for (const id of [102, 103]) assert.equal((await call('update', 'manager', { id, phone: '123' })).status, 404)
  assert.equal((await call('delete', 'manager', { id: 101 })).status, 403)
})

test('本人精確以 user_id 限制，只能更新電話，不以 users.id 猜測員工', async () => {
  await fixture(201, 'staff', 3)
  await fixture(3)
  const rows = await (await call('list', 'staff')).json()
  assert.deepEqual(rows.map(r => r.id), [201])
  assert.equal((await call('update', 'staff', { id: 201, phone: '' })).status, 200)
  assert.equal((await call('update', 'staff', { id: 3, phone: '123' })).status, 404)
  for (const field of ['status', 'role', 'password', 'user_id', 'tenant_id', 'name']) {
    assert.equal((await call('update', 'staff', { id: 201, [field]: 'bad' })).status, 400)
  }
  assert.equal((await call('create', 'staff', { name: '測試', email: 'x@example.invalid' })).status, 403)
  assert.equal((await call('delete', 'staff', { id: 201 })).status, 403)
  await db.prepare('DELETE FROM project_b_employees WHERE member_id=201').run()
  assert.deepEqual(await (await call('list', 'staff')).json(), [])
})

test('已綁定或存在未移植歷史表時禁止刪除，停用員工不影響登入', async () => {
  await fixture(301, 'staff', 3)
  await fixture(302)
  assert.equal((await call('delete', 'super_admin', { id: 301 })).status, 409)
  assert.equal((await call('update', 'super_admin', { id: 301, status: 'inactive' })).status, 200)
  assert.equal((await call('list', 'staff')).status, 200)
  await db.prepare('CREATE TABLE project_b_history_probe (member_id INTEGER)').run()
  assert.equal((await call('delete', 'super_admin', { id: 302 })).status, 409)
  assert.ok(await db.prepare('SELECT * FROM project_b_employees WHERE member_id=302').first())
})

test('拒絕 ID／欄位注入、未知角色及無效輸入，失敗不殘留寫入', async () => {
  for (const body of [{ name: '', email: 'x@example.invalid' }, { name: 'x', email: 'bad' },
    { name: 'x', email: 'x@example.invalid', password: 'not-stored' },
    { name: 'x', email: 'x@example.invalid', user_id: 3 },
    { name: 'x', email: 'x@example.invalid', phone: 'x'.repeat(33) },
    { name: 'x', email: 'x@example.invalid', role: 'owner' },
    { name: 'x', email: 'x@example.invalid', status: 'deleted' }]) {
    const response = await call('create', 'super_admin', body)
    assert.equal(response.status, 400)
    assert.equal((await response.json()).traceId, response.headers.get('x-trace-id'))
  }
  for (const id of ['1 OR 1=1', '1', -1, 1.5, null]) {
    assert.equal((await call('update', 'super_admin', { id, phone: 'x' })).status, 400)
  }
  assert.equal((await call('update', 'super_admin', { id: 999, phone: 'x' })).status, 404)
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM project_b_employees').first()).n, 0)
})
