import assert from 'node:assert/strict'
import { deploymentTarget } from './deployment-targets.mjs'

const base = process.argv[2]
const target = process.argv[3] ? deploymentTarget(process.argv[3]) : deploymentTarget()
if (!base) throw new Error('請指定測試網址')
assert.equal(base.replace(/\/$/, ''), target.base, '網址與目標必須一致')

for (const path of ['/', '/about']) {
  const response = await fetch(new URL(path, base))
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('content-type') ?? '', /text\/html/)
  assert.match(await response.text(), /id="app"/)
  console.log(`${path}: HTML 200`)
}

const health = await fetch(new URL('/api/health', base))
assert.equal(health.status, 200)
assert.deepEqual(await health.json(), {
  ok: true,
  service: target.name,
  database: 'ok',
})
console.log('/api/health: Worker 與 D1 正常')

const missing = await fetch(new URL('/api/missing', base))
assert.equal(missing.status, 404)
assert.equal((await missing.json()).error.code, 'NOT_FOUND')
console.log('/api/missing: JSON 404')
