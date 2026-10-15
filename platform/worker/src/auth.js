import { digestToken, randomToken, verifyPassword } from './credentials.js'
import { HttpError, json, readJson } from './response.js'

const SESSION_SECONDS = 8 * 60 * 60
const LOGIN_WINDOW_SECONDS = 15 * 60

export function projectForRequest(request, env) {
  const project = env.PROJECT_ID
  if (typeof project !== 'string' || !/^[a-zA-Z0-9-]{1,50}$/.test(project)) {
    throw new HttpError(503, 'PROJECT_NOT_CONFIGURED', '專案尚未設定')
  }
  const requested = request.headers.get('X-Project')
  if (!requested) throw new HttpError(400, 'PROJECT_REQUIRED', '缺少專案識別')
  if (requested !== project) throw new HttpError(403, 'PROJECT_MISMATCH', '專案識別不符')
  if (new URL(request.url).searchParams.has('token')) {
    throw new HttpError(400, 'QUERY_TOKEN_NOT_ALLOWED', '請使用 Authorization Bearer 傳遞 Token')
  }
  return project
}

function bearer(request) {
  const header = request.headers.get('Authorization')
  if (!header) return null
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(header)
  if (!match) throw new HttpError(400, 'INVALID_AUTHORIZATION', 'Authorization 格式錯誤')
  return match[1]
}

function userPayload(user) {
  return { id: Number(user.id), tenant_id: user.tenant_id, username: user.username,
    name: user.name, role: user.role, company_id: user.company_id,
    is_super_admin: user.role === 'super_admin' }
}

async function enforceLoginLimit(request, env, project, username) {
  const window = Math.floor(Date.now() / 1000 / LOGIN_WINDOW_SECONDS)
  const keys = [
    { value: `user:${project}:${username}`, max: 10 },
    { value: `ip:${project}:${request.headers.get('CF-Connecting-IP') ?? 'local'}`, max: 50 },
  ]
  const hashes = await Promise.all(keys.map(key => digestToken(key.value)))
  const sql = `INSERT INTO auth_login_limits (key_hash, window_id, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts = CASE WHEN window_id = excluded.window_id THEN attempts + 1 ELSE 1 END,
      window_id = excluded.window_id
    RETURNING attempts`
  const results = await env.DB.batch(hashes.map(key => env.DB.prepare(sql).bind(key, window)))
  if (results.some((result, i) => Number(result.results[0].attempts) > keys[i].max)) {
    throw new HttpError(429, 'LOGIN_RATE_LIMITED', '登入嘗試過於頻繁，請稍後再試')
  }
  // 只保留最近一天的限制紀錄，不持久累積已過期的帳號／IP 雜湊。
  await env.DB.prepare('DELETE FROM auth_login_limits WHERE window_id < ?').bind(window - 96).run()
}

export async function login(request, env) {
  const project = projectForRequest(request, env)
  const body = await readJson(request)
  if (typeof body.username !== 'string' || typeof body.password !== 'string' ||
      !body.username.trim() || !body.password) {
    throw new HttpError(400, 'CREDENTIALS_REQUIRED', '缺少帳號或密碼')
  }
  const username = body.username.trim().toLowerCase()
  if (username.length > 50 || body.password.length > 256) {
    throw new HttpError(400, 'INVALID_CREDENTIALS', '帳號或密碼格式錯誤')
  }
  await enforceLoginLimit(request, env, project, username)
  const user = await env.DB.prepare(`SELECT id, tenant_id, username, password_hash,
    name, role, company_id, status FROM users WHERE tenant_id = ? AND username = ? LIMIT 1`)
    .bind(project, username).first()
  let verified
  try {
    verified = await verifyPassword(body.password, user?.password_hash)
  } catch {
    throw new HttpError(503, 'PASSWORD_CRYPTO_UNAVAILABLE', '密碼驗證暫時不可用')
  }
  if (!verified || Number(user?.status) !== 1) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', '帳號或密碼錯誤')
  }
  const token = randomToken()
  const now = Math.floor(Date.now() / 1000)
  await env.DB.prepare(`INSERT INTO user_tokens
    (tenant_id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(project, user.id, await digestToken(token), now, now + SESSION_SECONDS).run()
  return json({ success: true, user: userPayload(user), token })
}

async function findSession(request, env, project) {
  const token = bearer(request)
  if (!token) return null
  const user = await env.DB.prepare(`SELECT u.id, u.tenant_id, u.username, u.name,
    u.role, u.company_id FROM user_tokens t
    JOIN users u ON u.tenant_id = t.tenant_id AND u.id = t.user_id
    WHERE t.token_hash = ? AND t.tenant_id = ? AND t.revoked_at IS NULL
      AND t.expires_at > ? AND u.status = 1 LIMIT 1`)
    .bind(await digestToken(token), project, Math.floor(Date.now() / 1000)).first()
  return user ? { user: userPayload(user), token } : null
}

export async function session(request, env) {
  const found = await findSession(request, env, projectForRequest(request, env))
  return json({ success: true, authenticated: found !== null,
    user: found?.user ?? null, token: found?.token ?? null })
}

export async function logout(request, env) {
  const project = projectForRequest(request, env)
  const token = bearer(request)
  if (token) {
    await env.DB.prepare(`UPDATE user_tokens SET revoked_at = ?
      WHERE token_hash = ? AND tenant_id = ? AND revoked_at IS NULL`)
      .bind(Math.floor(Date.now() / 1000), await digestToken(token), project).run()
  }
  return json({ success: true })
}

// 業務 handler 以資料庫身份判斷權限，不接受客戶端傳來的角色。
export async function requireSession(request, env, allowedRoles = []) {
  const found = await findSession(request, env, projectForRequest(request, env))
  if (!found) throw new HttpError(401, 'UNAUTHORIZED', '請先登入')
  if (allowedRoles.length && !allowedRoles.includes(found.user.role)) {
    throw new HttpError(403, 'FORBIDDEN', '權限不足')
  }
  return found.user
}
