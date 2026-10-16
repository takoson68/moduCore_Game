import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

// 使用一次性實際 D1，測試資料不進入 Migration 或遠端環境。
async function withDatabase(work) {
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true,
    script: 'export default {fetch(){return new Response("local")}}',
    compatibilityDate: '2026-10-15', d1Databases: ['DB'] }))
  try {
    const db = await mf.getD1Database('DB')
    const statements = async file => (await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'))
      .split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s))
    for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
      if (!file.startsWith('0004_')) await db.batch(await statements(file))
    }
    await work(db, () => statements('0004_project_b_employees.sql'))
  } finally { await mf.dispose() }
}

// 只建立符合既有 CHECK 的合成身份，不提供可登入的密碼編碼。
async function insertUser(db, id, tenant = 'project-b') {
  await db.prepare('INSERT INTO users (id,tenant_id,username,password_hash,name,role) VALUES (?,?,?,?,?,?)')
    .bind(id, tenant, `fixture-${id}`, 'scrypt$16384$8$5$schema-only', '合成身份', 'staff').run()
}

// 省略 user_id 表示純員工資料；所有值使用參數綁定。
function insertEmployee(db, name = '合成員工', email = 'fixture@example.invalid', userId = null) {
  return db.prepare('INSERT INTO project_b_employees (name,email,user_id) VALUES (?,?,?)')
    .bind(name, email, userId)
}

test('0004 空庫可建立、重跑保留資料，純員工不建立帳戶或密碼欄位', async () => {
  await withDatabase(async (db, migration) => {
    await db.batch(await migration())
    await insertEmployee(db).run()
    await insertEmployee(db, '第二位').run()
    const before = (await db.prepare('SELECT * FROM project_b_employees').all()).results
    await db.batch(await migration())
    assert.deepEqual((await db.prepare('SELECT * FROM project_b_employees').all()).results, before)
    assert.equal(before.length, 2)
    assert.equal(before[0].user_id, null)
    assert.equal(before[0].tenant_id, 'project-b')
    assert.equal(before[0].status, 'active')
    assert.ok(Number.isInteger(before[0].created_at))
    const columns = (await db.prepare('PRAGMA table_info(project_b_employees)').all()).results.map(r => r.name)
    assert.ok(!columns.some(c => /password|token/.test(c)))
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').first()).n, 0)
  })
})

test('0004 保留既有身份與 Token，中途失敗整批回復且可重試', async () => {
  await withDatabase(async (db, migration) => {
    await insertUser(db, 80)
    await db.prepare('INSERT INTO user_tokens (tenant_id,user_id,token_hash,created_at,expires_at) VALUES (?,?,?,?,?)')
      .bind('project-b', 80, 'a'.repeat(64), 1, 9999999999).run()
    const users = (await db.prepare('SELECT * FROM users').all()).results
    const tokens = (await db.prepare('SELECT * FROM user_tokens').all()).results
    const statements = await migration()
    await assert.rejects(() => db.batch([...statements, db.prepare('INSERT INTO missing_employee_table VALUES (1)')]))
    assert.equal(await db.prepare("SELECT name FROM sqlite_master WHERE name='project_b_employees'").first(), null)
    await db.batch(await migration())
    assert.deepEqual((await db.prepare('SELECT * FROM users').all()).results, users)
    assert.deepEqual((await db.prepare('SELECT * FROM user_tokens').all()).results, tokens)
    assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0)
  })
})

test('員工僅可連結同專案帳戶一次，不可刪除已連結帳戶或同步其權限', async () => {
  await withDatabase(async (db, migration) => {
    await db.batch(await migration())
    await insertUser(db, 90)
    await insertUser(db, 91, 'dineCore')
    await insertEmployee(db, '已連結', 'linked@example.invalid', 90).run()
    await assert.rejects(() => insertEmployee(db, '重複', 'duplicate@example.invalid', 90).run())
    await assert.rejects(() => insertEmployee(db, '外專案', 'other@example.invalid', 91).run())
    await assert.rejects(() => insertEmployee(db, '不存在', 'missing@example.invalid', 999).run())
    await assert.rejects(() => db.prepare("UPDATE project_b_employees SET tenant_id='dineCore'").run())
    await assert.rejects(() => db.prepare('DELETE FROM users WHERE id=90').run())
    await db.prepare("UPDATE project_b_employees SET status='inactive',role='manager',name='員工姓名'").run()
    const user = await db.prepare('SELECT * FROM users WHERE id=90').first()
    assert.equal(user.role, 'staff')
    assert.equal(user.status, 1)
    assert.equal(user.name, '合成身份')
    assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0)
  })
})

test('欄位約束、並行自動編號、刪除後不重用 ID 與失敗寫入回復', async () => {
  await withDatabase(async (db, migration) => {
    await db.batch(await migration())
    for (const [field, value] of [['name', ' '], ['name', '長'.repeat(65)], ['email', ''],
      ['email', 'x'.repeat(256)], ['title', 'x'.repeat(65)], ['department', 'x'.repeat(65)],
      ['phone', 'x'.repeat(33)], ['status', 'bad'], ['role', 'owner']]) {
      await assert.rejects(() => db.prepare(`INSERT INTO project_b_employees (name,email,${field === 'name' || field === 'email' ? 'title' : field}) VALUES (?,?,?)`)
        .bind(field === 'name' ? value : '合成', field === 'email' ? value : 'fixture@example.invalid', field === 'name' || field === 'email' ? '' : value).run())
    }
    await Promise.all(Array.from({ length: 12 }, () => insertEmployee(db).run()))
    const rows = (await db.prepare('SELECT member_id FROM project_b_employees ORDER BY member_id').all()).results
    assert.equal(new Set(rows.map(r => r.member_id)).size, 12)
    const max = rows.at(-1).member_id
    await db.prepare('DELETE FROM project_b_employees WHERE member_id=?').bind(max).run()
    const next = await insertEmployee(db).run()
    assert.ok(next.meta.last_row_id > max)
    const count = (await db.prepare('SELECT COUNT(*) AS n FROM project_b_employees').first()).n
    await assert.rejects(() => db.batch([insertEmployee(db), insertEmployee(db, '')]))
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM project_b_employees').first()).n, count)
  })
})
