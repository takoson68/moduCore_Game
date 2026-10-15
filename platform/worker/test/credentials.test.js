import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scryptSync, pbkdf2Sync } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { hashPassword, verifyPassword } from '../src/credentials.js'

test('scrypt 編碼符合 Node 參考結果，拒絕錯誤密碼與非固定參數', async () => {
  const password = '合成密碼-test-only'
  const encoded = await hashPassword(password)
  const parts = encoded.split('$')
  assert.deepEqual(parts.slice(0, 4), ['scrypt', '16384', '8', '5'])
  assert.equal(parts[5], scryptSync(password, Buffer.from(parts[4], 'hex'), 32,
    { N: 16384, r: 8, p: 5 }).toString('hex'))
  assert.equal(await verifyPassword(password, encoded), true)
  assert.equal(await verifyPassword(`${password} `, encoded), false)
  for (const invalid of [undefined, 'plaintext', encoded.replace('$16384$', '$2$'), encoded.slice(0, -1)]) {
    assert.equal(await verifyPassword(password, invalid), false)
  }
  const legacySalt = Buffer.alloc(16)
  const legacy = `pbkdf2-sha256$600000$${legacySalt.toString('hex')}$${pbkdf2Sync(password, legacySalt, 600000, 32, 'sha256').toString('hex')}`
  assert.equal(await verifyPassword(password, legacy), true)
})

// 使用實際 D1 SQLite 驗證 CHECK 變更不遺失父子資料，失敗時則整批回復。
test('0003 保留既有帳戶、Token、外鍵；中途失敗可回復舊 Schema', async () => {
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: '2026-10-15', d1Databases: ['DB'],
  }))
  try {
    const db = await mf.getD1Database('DB')
    const statements = async name => (await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8'))
      .split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s))
    await db.batch(await statements('0002_auth.sql'))
    await db.prepare("INSERT INTO users (id,tenant_id,username,password_hash,name,role) VALUES (9,'project-a','legacy','pbkdf2-sha256$600000$preserve','保留','staff')").run()
    await db.prepare(`INSERT INTO user_tokens VALUES (7,'project-a',9,'${'a'.repeat(64)}',1,9999999999,NULL)`).run()
    const users = (await db.prepare('SELECT * FROM users').all()).results
    const tokens = (await db.prepare('SELECT * FROM user_tokens').all()).results
    const migration = await statements('0003_scrypt_credentials.sql')
    await assert.rejects(() => db.batch([...migration, db.prepare('INSERT INTO missing_migration_table VALUES (1)')]))
    assert.deepEqual((await db.prepare('SELECT * FROM users').all()).results, users)
    assert.deepEqual((await db.prepare('SELECT * FROM user_tokens').all()).results, tokens)
    await db.batch(migration)
    assert.deepEqual((await db.prepare('SELECT * FROM users').all()).results, users)
    assert.deepEqual((await db.prepare('SELECT * FROM user_tokens').all()).results, tokens)
    assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0)
    await assert.rejects(() => db.prepare("UPDATE user_tokens SET tenant_id='other'").run())
    await db.prepare('DELETE FROM users WHERE id=9').run()
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM user_tokens').first()).n, 0)
  } finally { await mf.dispose() }
})
