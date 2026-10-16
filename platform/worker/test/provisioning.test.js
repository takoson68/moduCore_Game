import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { adminStatement, provisionAdmin, remoteExecutor } from '../scripts/project-b-provisioning.mjs'
import { verifyPassword } from '../src/credentials.js'

const synthetic = () => ({ username: `local_${crypto.randomUUID().slice(0, 8)}`, name: '本機合成管理員',
  password: `合成密碼-${crypto.randomUUID()} `, confirmation: '' })

// 每案使用一次性實際 D1，不連接 Wrangler 遠端資源。
async function localDatabase(work) {
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true,
    script: 'export default {fetch(){return new Response("local")}}', compatibilityDate: '2026-10-15', d1Databases: ['DB'] }))
  try {
    const db = await mf.getD1Database('DB')
    const dir = new URL('../migrations/', import.meta.url)
    for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) {
      await db.batch((await readFile(new URL(file, dir), 'utf8')).split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)))
    }
    await work(db, (sql, params) => db.prepare(sql).bind(...params).all())
  } finally { await mf.dispose() }
}

test('空庫首位管理員只存 scrypt，身份固定且密碼空白不變', async () => {
  await localDatabase(async (db, execute) => {
    const input = synthetic(); input.confirmation = input.password
    const statement = await adminStatement(input)
    assert.ok(!statement.sql.includes(input.password))
    const result = await provisionAdmin(execute, statement)
    assert.equal(result.project, 'project-b')
    const user = await db.prepare('SELECT * FROM users').first()
    assert.equal(user.role, 'super_admin')
    assert.equal(user.tenant_id, 'project-b')
    assert.equal(await verifyPassword(input.password, user.password_hash), true)
    assert.equal(await verifyPassword(input.password.trim(), user.password_hash), false)
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM user_tokens').first()).n, 0)
  })
})

test('重跑不覆寫帳戶或密碼，停用管理員仍拒絕第二次 bootstrap', async () => {
  await localDatabase(async (db, execute) => {
    const input = synthetic(); input.confirmation = input.password
    const statement = await adminStatement(input)
    await provisionAdmin(execute, statement)
    await db.prepare('UPDATE users SET status=0').run()
    const before = (await db.prepare('SELECT * FROM users').all()).results
    await assert.rejects(() => provisionAdmin(execute, statement), /ADMIN_EXISTS_OR_NO_INSERT/)
    assert.deepEqual((await db.prepare('SELECT * FROM users').all()).results, before)
  })
})

test('並行 bootstrap 僅一筆成功，沒有 MAX+1 或先查再寫競態', async () => {
  await localDatabase(async (db, execute) => {
    const a = synthetic(); a.confirmation = a.password
    const b = synthetic(); b.confirmation = b.password
    const statements = await Promise.all([adminStatement(a), adminStatement(b)])
    const results = await Promise.allSettled(statements.map(s => provisionAdmin(execute, s)))
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM users WHERE tenant_id='project-b'").first()).n, 1)
  })
})

test('同名普通帳戶不被提升，其他 tenant 管理員不被修改', async () => {
  await localDatabase(async (db, execute) => {
    const input = synthetic(); input.confirmation = input.password
    const statement = await adminStatement(input)
    const hash = statement.params[2]
    await db.prepare("INSERT INTO users (tenant_id,username,password_hash,name,role) VALUES ('project-b',?,?,?,'staff')")
      .bind(input.username, hash, '既有員工').run()
    await db.prepare("INSERT INTO users (tenant_id,username,password_hash,name,role) VALUES ('dineCore','other',?,'其他專案','super_admin')").bind(hash).run()
    const before = (await db.prepare('SELECT * FROM users ORDER BY id').all()).results
    await assert.rejects(() => provisionAdmin(execute, statement), /PROVISION_FAILED/)
    assert.deepEqual((await db.prepare('SELECT * FROM users ORDER BY id').all()).results, before)
  })
})

test('欄位、短密碼與確認不符先拒絕，不輸出輸入內容', async () => {
  const valid = synthetic(); valid.confirmation = valid.password
  for (const input of [{ ...valid, username: "bad' OR 1=1" }, { ...valid, name: '' },
    { ...valid, password: 'short' }, { ...valid, confirmation: 'mismatch' }]) {
    await assert.rejects(() => adminStatement(input), error => /^(INVALID_IDENTITY|INVALID_PASSWORD|PASSWORD_MISMATCH)$/.test(error.message))
  }
})

test('遠端傳輸固定 project-b DB，API 錯誤不包含憑證或 SQL', async () => {
  assert.throws(() => remoteExecutor({ accountId: 'wrong', token: 'synthetic' }), /REMOTE_CREDENTIALS_REQUIRED/)
  let captured
  const execute = remoteExecutor({ accountId: '7cfb73ff5437f4b4438266632e7df5f7', token: 'synthetic-only',
    fetcher: async (url, options) => {
      captured = { url, options }
      return { ok: true, json: async () => ({ success: true, result: [{ success: true, meta: { changes: 1 }, results: [{ id: 1 }] }] }) }
    } })
  const input = synthetic(); input.confirmation = input.password
  await provisionAdmin(execute, await adminStatement(input))
  assert.ok(captured.url.endsWith('/d1/database/d446407c-6c4b-4746-b0fb-7368d850986c/query'))
  assert.equal(JSON.parse(captured.options.body).params[0], 'project-b')
  const failing = remoteExecutor({ accountId: '7cfb73ff5437f4b4438266632e7df5f7', token: 'synthetic-only',
    fetcher: async () => { throw new Error('private-token SQL password') } })
  await assert.rejects(() => failing('SELECT ?', []), error => error.message === 'REMOTE_QUERY_FAILED')
})

// 真正執行 CLI 子程序，只傳合成 stdin；不使用 shell、不把密碼放入 argv。
function runCLI(args, stdin = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/provision-project-b-admin.mjs', ...args], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), env: { PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', data => { output += data })
    child.stderr.on('data', data => { output += data })
    child.on('error', reject)
    child.on('close', code => resolve({ code, output }))
    child.stdin.on('error', () => {})
    child.stdin.end(stdin)
  })
}

test('CLI 預設僅本機一次性 D1；stdin 密碼、雜湊不回顯', async () => {
  const input = synthetic()
  const result = await runCLI(['--username', input.username, '--name', input.name], `${input.password}\n${input.password}\n`)
  assert.equal(result.code, 0)
  assert.ok(result.output.includes('未連線遠端'))
  assert.ok(!result.output.includes(input.password))
  assert.ok(!result.output.includes('scrypt$'))
})

test('CLI 拒絕密碼參數、任意 target、缺少遠端確認或憑證', async () => {
  for (const args of [['--password', 'synthetic-only'], ['--target', 'dinecore-staging'],
    ['--username', 'local', '--name', '合成', '--remote'],
    ['--username', 'local', '--name', '合成', '--remote', '--confirm-target', 'project-b-staging']]) {
    const result = await runCLI(args)
    assert.notEqual(result.code, 0)
    assert.ok(!result.output.includes('synthetic-only'))
    assert.ok(!result.output.includes('Authorization'))
  }
})
