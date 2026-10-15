import assert from 'node:assert/strict'

const base = process.argv[2]
if (!base) throw new Error('請指定測試網址')

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
  service: 'moducore-staging',
  database: 'ok',
})
console.log('/api/health: Worker 與 D1 正常')

const missing = await fetch(new URL('/api/missing', base))
assert.equal(missing.status, 404)
assert.equal((await missing.json()).error.code, 'NOT_FOUND')
console.log('/api/missing: JSON 404')
