import { parseArgs } from 'node:util'
import { createInterface } from 'node:readline'
import { Writable } from 'node:stream'
import { readFile, readdir } from 'node:fs/promises'
import { adminStatement, provisionAdmin, remoteExecutor } from './project-b-provisioning.mjs'

// 預設僅使用不持久化的本機 D1；任何真實佈建都需另行授權與明確遠端確認。
async function main() {
  let values
  try {
    values = parseArgs({ options: {
      username: { type: 'string' }, name: { type: 'string' }, remote: { type: 'boolean' },
      'confirm-target': { type: 'string' }, help: { type: 'boolean' },
    }, allowPositionals: false }).values
  } catch { throw new Error('INVALID_ARGUMENTS') }
  if (values.help) {
    console.log('用法：npm run admin:project-b -- --username <帳號> --name <顯示名稱>')
    console.log('預設為本機一次性合成驗證，不保留帳戶。密碼與確認各輸入一行；TTY 不回顯。')
    console.log('遠端另需 --remote --confirm-target project-b-staging 及既有 Cloudflare 環境憑證；須先取得使用者授權。')
    return
  }
  if (!values.username || !values.name) throw new Error('INVALID_IDENTITY')
  if (values.remote && values['confirm-target'] !== 'project-b-staging') throw new Error('REMOTE_CONFIRMATION_REQUIRED')
  if (!values.remote && values['confirm-target']) throw new Error('INVALID_ARGUMENTS')
  let execute, mf
  if (values.remote) {
    execute = remoteExecutor({ accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_API_TOKEN })
  }
  const [password, confirmation] = await readPasswords()
  const statement = await adminStatement({ username: values.username, name: values.name, password, confirmation })
  try {
    if (!values.remote) {
      const { Miniflare, convertV4MiniflareOptions } = await import('miniflare')
      mf = new Miniflare(convertV4MiniflareOptions({
        modules: true, script: 'export default {fetch(){return new Response("local")}}',
        compatibilityDate: '2026-10-15', d1Databases: ['DB'],
      }))
      const db = await mf.getD1Database('DB')
      const dir = new URL('../migrations/', import.meta.url)
      for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) {
        const sql = (await readFile(new URL(file, dir), 'utf8')).split(';').map(s => s.trim()).filter(Boolean)
        await db.batch(sql.map(s => db.prepare(s)))
      }
      execute = (sql, params) => db.prepare(sql).bind(...params).all()
    }
    const result = await provisionAdmin(execute, statement)
    console.log(values.remote ? 'project-b 首位管理員已建立；未顯示帳密。' : '本機一次性佈建驗證通過；不保留帳戶、未連線遠端。')
    console.log(JSON.stringify({ project: result.project, role: result.role, remote: Boolean(values.remote) }))
  } finally { await mf?.dispose() }
}

// 非 TTY 僅從 stdin 收兩行，限制總大小；不支援密碼參數、環境變數或檔案參數。
async function readPasswords() {
  if (!process.stdin.isTTY) {
    let text = ''
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) {
      text += chunk.toString('utf8')
      if (Buffer.byteLength(text) > 4096) throw new Error('INVALID_PASSWORD')
    }
    const lines = text.split('\n').map(line => line.endsWith('\r') ? line.slice(0, -1) : line)
    if (lines.at(-1) === '') lines.pop()
    if (lines.length !== 2) throw new Error('PASSWORD_INPUT_REQUIRED')
    return lines
  }
  const silent = new Writable({ write(_chunk, _encoding, done) { done() } })
  const rl = createInterface({ input: process.stdin, output: silent, terminal: true, historySize: 0 })
  rl.on('SIGINT', () => rl.close())
  const question = label => new Promise((resolve, reject) => {
    process.stdout.write(label)
    const onClose = () => reject(new Error('PASSWORD_INPUT_CANCELLED'))
    rl.once('close', onClose)
    rl.question('', answer => {
      rl.off('close', onClose)
      process.stdout.write('\n')
      resolve(answer)
    })
  })
  try { return [await question('密碼（不回顯）：'), await question('再次輸入密碼（不回顯）：')] }
  finally { rl.close() }
}

// 統一安全錯誤，不輸出原始例外、SQL、參數或 Token。
main().catch(error => {
  const safe = new Set(['INVALID_ARGUMENTS', 'INVALID_IDENTITY', 'INVALID_PASSWORD', 'PASSWORD_MISMATCH',
    'REMOTE_CONFIRMATION_REQUIRED', 'REMOTE_CREDENTIALS_REQUIRED', 'PASSWORD_INPUT_REQUIRED',
    'PASSWORD_INPUT_CANCELLED', 'PROVISION_FAILED', 'ADMIN_EXISTS_OR_NO_INSERT'])
  console.error(`佈建未完成：${safe.has(error.message) ? error.message : 'SAFE_PROVISION_FAILURE'}`)
  process.exitCode = 1
})
