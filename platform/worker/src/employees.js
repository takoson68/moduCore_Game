import { requireSession } from './auth.js'
import { HttpError, json, readJson } from './response.js'

const fields = { name: 64, title: 64, department: 64, email: 255, phone: 32, role: 32, status: 8 }
const projection = `SELECT e.member_id AS id,e.member_id,e.tenant_id,e.user_id,e.name,e.title,
  e.department,e.email,e.phone,e.role,e.status,COALESCE(u.username,'') AS username,u.status AS user_status
  FROM project_b_employees e LEFT JOIN users u ON u.tenant_id=e.tenant_id AND u.id=e.user_id`

// 限定專案與已知身份，其他專案不會因共用路由取得此業務能力。
async function identity(request, env) {
  const user = await requireSession(request, env, ['super_admin', 'manager', 'staff'])
  if (user.tenant_id !== 'project-b') throw new HttpError(404, 'NOT_FOUND', '找不到 API')
  return user
}

// 僅接受白名單欄位，密碼與帳戶綁定不屬於員工 CRUD。
function validate(body, user, create = false) {
  const values = {}
  for (const key of Object.keys(body)) {
    if (key === 'id' && !create) continue
    if (!Object.hasOwn(fields, key) || (user.role === 'staff' && key !== 'phone')) {
      throw new HttpError(400, 'INVALID_FIELD', '包含不允許的欄位')
    }
    const value = body[key]
    if (typeof value !== 'string' || value.length > fields[key] || /[\u0000-\u001f\u007f]/.test(value)) {
      throw new HttpError(400, 'INVALID_FIELD', '欄位格式錯誤')
    }
    values[key] = value.trim()
    if (['name', 'email'].includes(key) && !values[key]) throw new HttpError(400, 'INVALID_FIELD', '姓名與 Email 不可空白')
    if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[key])) throw new HttpError(400, 'INVALID_FIELD', 'Email 格式錯誤')
    if (key === 'status' && !['active', 'inactive'].includes(value)) throw new HttpError(400, 'INVALID_FIELD', '狀態錯誤')
    if (key === 'role' && !['staff', 'manager', 'super_admin'].includes(value)) throw new HttpError(400, 'INVALID_FIELD', '角色錯誤')
  }
  if (create && (!values.name || !values.email)) throw new HttpError(400, 'INVALID_FIELD', '缺少姓名或 Email')
  if (!Object.keys(values).length) throw new HttpError(400, 'INVALID_FIELD', '沒有可更新欄位')
  if (user.role === 'manager' && values.role && values.role !== 'staff') throw new HttpError(403, 'FORBIDDEN', '主管僅可管理一般員工')
  return values
}

// 員工 ID 不等於 users.id，不接受字串或非整數的模糊轉換。
function memberId(body) {
  if (!Number.isSafeInteger(body.id) || body.id <= 0) throw new HttpError(400, 'INVALID_ID', '員工編號錯誤')
  return body.id
}

// 以同一 SQL 限制本人與管理範圍，連結的管理帳戶亦受保護。
function scope(user) {
  if (user.role === 'staff') return { sql: ' AND e.user_id=?', params: [user.id] }
  if (user.role === 'manager') return { sql: ` AND e.role='staff' AND NOT EXISTS
    (SELECT 1 FROM users a WHERE a.tenant_id=e.tenant_id AND a.id=e.user_id AND a.role!='staff')`, params: [] }
  return { sql: '', params: [] }
}

export async function listEmployees(request, env) {
  const user = await identity(request, env)
  const filter = user.role === 'staff' ? ' AND e.user_id=?' : ''
  const params = user.role === 'staff' ? [user.tenant_id, user.id] : [user.tenant_id]
  // 保留陣列契約，不默默截斷；超過小型專案上限要求另訂分頁。
  const result = await env.DB.prepare(`${projection} WHERE e.tenant_id=?${filter} ORDER BY e.member_id LIMIT 1001`).bind(...params).all()
  if (result.results.length > 1000) throw new HttpError(409, 'PAGINATION_REQUIRED', '資料過多，需使用分頁功能')
  return json(result.results)
}

export async function createEmployee(request, env) {
  const user = await identity(request, env)
  if (user.role === 'staff') throw new HttpError(403, 'FORBIDDEN', '權限不足')
  const values = validate(await readJson(request), user, true)
  const keys = Object.keys(values)
  const row = await env.DB.prepare(`INSERT INTO project_b_employees (tenant_id,${keys.join(',')})
    VALUES (?,${keys.map(() => '?').join(',')}) RETURNING member_id`).bind(user.tenant_id, ...Object.values(values)).first()
  return json(await env.DB.prepare(`${projection} WHERE e.tenant_id=? AND e.member_id=?`).bind(user.tenant_id, row.member_id).first())
}

export async function updateEmployee(request, env) {
  const user = await identity(request, env)
  const body = await readJson(request)
  const id = memberId(body)
  const values = validate(body, user)
  const filter = scope(user)
  const row = await env.DB.prepare(`UPDATE project_b_employees AS e SET ${Object.keys(values).map(k => `${k}=?`).join(',')},updated_at=unixepoch()
    WHERE e.tenant_id=? AND e.member_id=?${filter.sql} RETURNING member_id`)
    .bind(...Object.values(values), user.tenant_id, id, ...filter.params).first()
  if (!row) throw new HttpError(404, 'NOT_FOUND', '找不到可操作的員工')
  return json(await env.DB.prepare(`${projection} WHERE e.tenant_id=? AND e.member_id=?`).bind(user.tenant_id, id).first())
}

// 尚未移植的歷史表若存在，保守禁止刪除，避免猜測引用欄位而漏刪保護。
export async function deleteEmployee(request, env) {
  const user = await identity(request, env)
  if (user.role !== 'super_admin') throw new HttpError(403, 'FORBIDDEN', '僅管理員可刪除')
  const body = await readJson(request)
  if (Object.keys(body).some(k => k !== 'id')) throw new HttpError(400, 'INVALID_FIELD', '包含不允許的欄位')
  const id = memberId(body)
  const row = await env.DB.prepare('SELECT user_id FROM project_b_employees WHERE tenant_id=? AND member_id=?').bind(user.tenant_id, id).first()
  if (!row) throw new HttpError(404, 'NOT_FOUND', '找不到員工')
  const result = await env.DB.prepare(`DELETE FROM project_b_employees WHERE tenant_id=? AND member_id=? AND user_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name GLOB 'project_b_*'
      AND name!='project_b_employees') RETURNING member_id`).bind(user.tenant_id, id).first()
  if (!result) throw new HttpError(409, 'EMPLOYEE_IN_USE', '已有帳戶關聯或業務資料，請改為停用')
  return json({ success: true })
}
