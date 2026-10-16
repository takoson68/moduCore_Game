import { login, logout, session } from './auth.js'
import { errorResponse, HttpError, json } from './response.js'

const routes = new Map([
  ['/api/health', { GET: healthResponse }],
  ['/api/login', { POST: login }],
  ['/api/logout', { POST: logout }],
  ['/api/session', { GET: session }],
  ['/api/restore-session', { GET: session }],
])

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)
    const traceId = crypto.randomUUID()
    try {
      const methods = routes.get(url.pathname.replace(/\/+$/, ''))
      if (!methods) throw new HttpError(404, 'NOT_FOUND', '找不到 API')
      const handler = Object.hasOwn(methods, request.method) ? methods[request.method] : undefined
      if (typeof handler !== 'function') {
        const response = errorResponse(new HttpError(405, 'METHOD_NOT_ALLOWED', '不支援此方法'), traceId)
        response.headers.set('allow', Object.keys(methods).join(', '))
        response.headers.set('x-trace-id', traceId)
        return response
      }
      const response = await handler(request, env)
      response.headers.set('x-trace-id', traceId)
      return response
    } catch (error) {
      if (!(error instanceof HttpError)) console.error({ traceId, code: 'INTERNAL_ERROR' })
      const response = errorResponse(error, traceId)
      response.headers.set('x-trace-id', traceId)
      return response
    }
  },
}

async function healthResponse(_request, env) {
  try {
    const result = await env.DB.prepare('SELECT 1 AS ok').first()
    const databaseReady = Number(result?.ok) === 1

    return json(
      {
        ok: databaseReady,
        service: env.SERVICE_NAME || 'moducore-staging',
        database: databaseReady ? 'ok' : 'error',
      },
      databaseReady ? 200 : 503
    )
  } catch {
    return json(
      {
        ok: false,
        service: env.SERVICE_NAME || 'moducore-staging',
        database: 'error',
        error: { code: 'D1_UNAVAILABLE' },
      },
      503
    )
  }
}
