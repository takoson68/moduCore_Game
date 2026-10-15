import assert from 'node:assert/strict'
import test from 'node:test'

import worker from '../src/index.js'

function createEnvironment({ databaseResult = { ok: 1 }, databaseError = null } = {}) {
  return {
    DB: {
      prepare(sql) {
        assert.equal(sql, 'SELECT 1 AS ok')
        return {
          async first() {
            if (databaseError) throw databaseError
            return databaseResult
          },
        }
      },
    },
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`)
      },
    },
  }
}

test('GET /api/health 回報 Worker 與 D1 正常', async () => {
  const response = await worker.fetch(
    new Request('https://example.test/api/health'),
    createEnvironment()
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'moducore-staging',
    database: 'ok',
  })
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('D1 無法使用時回傳穩定錯誤且不洩漏例外內容', async () => {
  const response = await worker.fetch(
    new Request('https://example.test/api/health'),
    createEnvironment({ databaseError: new Error('sensitive database detail') })
  )

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    ok: false,
    service: 'moducore-staging',
    database: 'error',
    error: { code: 'D1_UNAVAILABLE' },
  })
})

test('health endpoint 拒絕非 GET 方法', async () => {
  const response = await worker.fetch(
    new Request('https://example.test/api/health', { method: 'POST' }),
    createEnvironment()
  )

  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'GET')
})

test('未知 API 回傳 JSON 404', async () => {
  const response = await worker.fetch(
    new Request('https://example.test/api/missing'),
    createEnvironment()
  )

  assert.equal(response.status, 404)
  const body = await response.json()
  assert.equal(body.ok, false)
  assert.equal(body.error.code, 'NOT_FOUND')
  assert.equal(body.traceId, response.headers.get('x-trace-id'))
})

test('非 API 請求可交給 Static Assets', async () => {
  const response = await worker.fetch(
    new Request('https://example.test/deep/link'),
    createEnvironment()
  )

  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'asset:/deep/link')
})

test('自訂 HTTP 方法不能命中 Object 原型方法', async () => {
  const response = await worker.fetch(new Request('https://example.test/api/health', {
    method: 'constructor',
  }), createEnvironment())
  assert.equal(response.status, 405)
})
