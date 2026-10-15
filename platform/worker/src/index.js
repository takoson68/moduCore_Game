const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      if (request.method !== 'GET') {
        return jsonResponse(
          { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } },
          405,
          { allow: 'GET' }
        )
      }

      return healthResponse(env)
    }

    if (url.pathname.startsWith('/api/')) {
      return jsonResponse({ ok: false, error: { code: 'NOT_FOUND' } }, 404)
    }

    return env.ASSETS.fetch(request)
  },
}

async function healthResponse(env) {
  try {
    const result = await env.DB.prepare('SELECT 1 AS ok').first()
    const databaseReady = Number(result?.ok) === 1

    return jsonResponse(
      {
        ok: databaseReady,
        service: 'moducore-staging',
        database: databaseReady ? 'ok' : 'error',
      },
      databaseReady ? 200 : 503
    )
  } catch {
    return jsonResponse(
      {
        ok: false,
        service: 'moducore-staging',
        database: 'error',
        error: { code: 'D1_UNAVAILABLE' },
      },
      503
    )
  }
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  })
}
