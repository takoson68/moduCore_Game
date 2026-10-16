// 僅在明確授權 Staging 更新與回復後執行；不更動舊站或 project-b 的部署。
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { deploymentTarget } from './deployment-targets.mjs'
import { hashPassword } from '../src/credentials.js'

const exec = promisify(execFile)
const cwd = fileURLToPath(new URL('../', import.meta.url))
const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
const a = deploymentTarget('dinecore-staging')
const b = deploymentTarget('project-b-staging')
const legacy = deploymentTarget()

// CLI 的 SQL 參數可能含合成雜湊，不把原始錯誤／參數輸出到日誌。
async function run(args) {
  try {
    return (await exec(process.execPath, [cli, ...args], { cwd, maxBuffer: 2 * 1024 * 1024 })).stdout
  } catch { throw new Error('隔離演練 CLI 失敗，請確認 Staging 狀態') }
}
async function version(target) {
  const deployments = JSON.parse(await run(['deployments', 'list', '--config', target.config, '--json']))
  const last = deployments.sort((x, y) => x.created_on.localeCompare(y.created_on)).at(-1)
  assert.equal(last.versions.length, 1)
  assert.equal(last.versions[0].percentage, 100)
  return last.versions[0].version_id
}
async function sql(target, command) {
  return JSON.parse(await run(['d1', 'execute', target.database, '--config', target.config,
    '--remote', '--json', '--command', command]))
}
async function snapshot(target) {
  return (await sql(target, 'SELECT * FROM users ORDER BY id; SELECT * FROM user_tokens ORDER BY id; SELECT * FROM m1_deployment_probe ORDER BY id;'))
    .map(result => result.results)
}
async function healthy(target) {
  const response = await fetch(`${target.base}/api/health`)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).database, 'ok')
}
const [baseA, baseB, baseLegacy] = await Promise.all([version(a), version(b), version(legacy)])
const oldData = await snapshot(legacy)
const username = `m31_probe_${crypto.randomUUID().replaceAll('-', '')}`
const hash = await hashPassword(crypto.randomUUID())
let seeded = false
try {
  await sql(b, `INSERT INTO users (tenant_id,username,password_hash,name,role)
    VALUES ('project-b','${username}','${hash}','M3.1 隔離驗收','staff')`)
  seeded = true
  const beforeB = await snapshot(b)
  await run(['deploy', '--config', a.config, '--var', 'RELEASE_CHECK:m31-isolation-drill'])
  const updatedA = await version(a)
  assert.notEqual(updatedA, baseA)
  assert.equal(await version(b), baseB)
  assert.equal(await version(legacy), baseLegacy)
  assert.deepEqual(await snapshot(b), beforeB)
  assert.deepEqual(await snapshot(legacy), oldData)
  console.log(JSON.stringify({stage:'update-isolation-passed',baseA,updatedA,unchangedB:baseB,unchangedLegacy:baseLegacy}))
  await run(['rollback', baseA, '--config', a.config, '--yes', '--message', 'M3.1 verified isolation rollback'])
  assert.equal(await version(a), baseA)
  assert.equal(await version(b), baseB)
  assert.equal(await version(legacy), baseLegacy)
  assert.deepEqual(await snapshot(b), beforeB)
  assert.deepEqual(await snapshot(legacy), oldData)
  await Promise.all([healthy(a), healthy(b), healthy(legacy)])
  console.log('回復 dineCore 後，project-b 的版本與合成資料、舊站版本與資料均未改變；三站 health 通過')
} finally {
  try {
    if (await version(a) !== baseA) {
      await run(['rollback', baseA, '--config', a.config, '--yes', '--message', 'M3.1 cleanup restore baseline'])
    }
  } finally {
    if (seeded) {
      await sql(b, `DELETE FROM users WHERE tenant_id='project-b' AND username='${username}'`)
      console.log('已清除本次 project-b 合成隔離驗收帳戶')
    }
  }
}
