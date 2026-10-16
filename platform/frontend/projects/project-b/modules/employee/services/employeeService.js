import world from '@/world.js'
import { employeeApi } from '../api/employeeApi.js'

// 白名單排除密碼、雜湊與非預期回應欄位。
export function safeEmployee(row) {
  if (!row || !Number.isSafeInteger(row.id)) throw new Error('員工回應格式錯誤')
  return Object.fromEntries(['id', 'member_id', 'user_id', 'tenant_id', 'name', 'title', 'department',
    'email', 'phone', 'status', 'role', 'username', 'user_status'].map(key => [key, row[key]]))
}

// 失敗不得轉成空表；身份變更後拒絕延遲寫回。
async function run(operation, apply) {
  const store = world.store('employeeStore')
  const epoch = store.state.sessionEpoch
  const userId = world.store('auth').state.user?.id
  let result
  try { result = await operation() } catch { throw new Error('無法連線至員工服務') }
  if (epoch !== store.state.sessionEpoch || world.store('auth').state.user?.id !== userId) throw new Error('身份已變更，請重新載入')
  if (result && typeof result === 'object' && 'ok' in result) {
    if (!result.ok || result.data?.success === false) {
      const messages = { 401: '登入已失效，請重新登入', 403: '沒有操作權限', 404: '找不到可操作的員工',
        409: '資料有關聯或超出限制，請改為停用或聯絡管理員', 400: '輸入資料不符合規則' }
      throw new Error(messages[result.status] || '員工服務暫時無法使用')
    }
    result = result.data
  }
  return apply(result, store)
}

export const employeeService = {
  async fetchList() {
    return run(() => employeeApi.list(), (data, store) => {
      if (!Array.isArray(data)) throw new Error('員工清單回應格式錯誤')
      const rows = data.map(safeEmployee); store.setList(rows); return rows
    })
  },
  async create(payload) {
    return run(() => employeeApi.create(payload), (data, store) => {
      const row = safeEmployee(data); store.addEmployee(row); return row
    })
  },
  async update(id, payload) {
    return run(() => employeeApi.update(id, payload), (data, store) => {
      const row = safeEmployee(data); store.updateEmployee(id, row); return row
    })
  },
  async remove(id) {
    return run(() => employeeApi.remove(id), (data, store) => {
      if (data?.success !== true) throw new Error('刪除尚未確認')
      store.removeEmployee(id)
    })
  },
}
