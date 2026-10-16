// 僅供人工瀏覽器整合驗收：loopback、一次性 D1、合成身份，沒有遠端 Binding 或 HTTP 控制端點。
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import { adminStatement, provisionAdmin } from './project-b-provisioning.mjs'

const project = 'project-b'
const username = 'local-m4a3-synthetic'
// 固定值僅用於此隔離且不持久化的測試程序，不是部署帳戶或正式預設值。
const password = 'Synthetic-Local-M4-A3-Only!'
const mf = new Miniflare(convertV4MiniflareOptions({
  host: '127.0.0.1', port: 8789,
  modules: ['index.js', 'auth.js', 'credentials.js', 'response.js', 'employees.js'].map(name => ({
    type: 'ESModule', path: fileURLToPath(new URL(`../src/${name}`, import.meta.url)),
  })),
  compatibilityDate: '2026-10-15', compatibilityFlags: ['nodejs_compat'],
  bindings: { PROJECT_ID: project, SERVICE_NAME: 'project-b-staging' },
  d1Databases: ['DB'],
  assets: { directory: fileURLToPath(new URL('../.assets/project-b-staging/', import.meta.url)),
    binding: 'ASSETS', run_worker_first: ['/api', '/api/*'],
    routerConfig: { has_user_worker: true },
    assetConfig: { not_found_handling: 'single-page-application' } },
}))
const db = await mf.getD1Database('DB')
const dir = new URL('../migrations/', import.meta.url)
for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) {
  await db.batch((await readFile(new URL(file, dir), 'utf8')).split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)))
}
await provisionAdmin((sql, params) => db.prepare(sql).bind(...params).all(),
  await adminStatement({ username, name: '本機整合驗收', password, confirmation: password }))
const syntheticUser = await db.prepare('SELECT id FROM users WHERE tenant_id=? AND username=?').bind(project, username).first()
// 第二個合成帳戶只用來驗證換身份隔離，不提供正式預設使用者。
await db.prepare(`INSERT INTO users (tenant_id,username,password_hash,name,role)
  SELECT tenant_id,'local-m4d-other',password_hash,'本機另一位員工','staff' FROM users WHERE id=?`).bind(syntheticUser.id).run()
await db.batch([
  db.prepare("INSERT INTO project_b_employees (member_id,name,email,role) VALUES (101,'合成管理員資料','admin@example.invalid','super_admin')"),
  db.prepare("INSERT INTO project_b_employees (member_id,name,email,role) VALUES (102,'合成一般員工','staff@example.invalid','staff')"),
  db.prepare("INSERT INTO project_b_employees (member_id,name,email,user_id) VALUES (103,'合成本人','self@example.invalid',?)").bind(syntheticUser.id),
])
await mf.ready
console.log('本機 project-b 整合環境：http://127.0.0.1:8789/；一次性 DB，不使用遠端資源。')
console.log('stdin 控制：summary、expire、disable、enable、manager、staff、admin、unlink、link、api-fail、api-restore、quit；不回傳密碼或 Token。')
const input = createInterface({ input: process.stdin })
try {
  for await (const command of input) {
    if (command === 'quit') break
    if (['manager', 'staff', 'admin'].includes(command)) {
      await db.prepare('UPDATE users SET role=? WHERE id=?').bind(command === 'admin' ? 'super_admin' : command, syntheticUser.id).run()
    } else if (command === 'unlink' || command === 'link') {
      await db.prepare('UPDATE project_b_employees SET user_id=? WHERE member_id=103').bind(command === 'link' ? syntheticUser.id : null).run()
    } else if (command === 'api-fail') await db.prepare('ALTER TABLE project_b_employees RENAME TO local_employee_hidden').run()
    else if (command === 'api-restore') await db.prepare('ALTER TABLE local_employee_hidden RENAME TO project_b_employees').run()
    else if (command === 'expire') await db.prepare('UPDATE user_tokens SET created_at=1,expires_at=2').run()
    else if (command === 'disable' || command === 'enable') {
      await db.prepare('UPDATE users SET status=? WHERE tenant_id=? AND username=?')
        .bind(command === 'enable' ? 1 : 0, project, username).run()
    } else if (command !== 'summary') { console.log('未知本機控制指令'); continue }
    const stats = await db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN revoked_at IS NOT NULL THEN 1 ELSE 0 END) AS revoked,
      SUM(CASE WHEN revoked_at IS NULL AND expires_at>unixepoch() THEN 1 ELSE 0 END) AS live
      FROM user_tokens`).first()
    console.log(JSON.stringify({ command, tokens: stats }))
  }
} finally { input.close(); await mf.dispose(); console.log('本機整合環境已關閉，一次性帳戶與資料已丟棄。') }
