export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers },
  })
}

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function errorResponse(error, traceId) {
  const known = error instanceof HttpError
  const status = known ? error.status : 500
  const code = known ? error.code : 'INTERNAL_ERROR'
  const message = known ? error.message : '伺服器內部錯誤'
  // 保留登入 API 的 success/message，同時提供統一錯誤碼與追蹤識別。
  return json({ success: false, ok: false, message, error: { code, message }, traceId }, status)
}

export async function readJson(request, maxBytes = 4096) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new HttpError(415, 'JSON_REQUIRED', '請使用 application/json')
  }
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, 'INVALID_JSON', '請提供 JSON 物件')
  const chunks = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      throw new HttpError(413, 'BODY_TOO_LARGE', '請求內容過大')
    }
    chunks.push(value)
  }
  try {
    const buffer = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength }
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer))
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error()
    return body
  } catch {
    throw new HttpError(400, 'INVALID_JSON', '請提供有效的 JSON 物件')
  }
}
