import assert from 'node:assert/strict'

// 共用本機與 Staging 驗收契約，不自行取得憑證或選擇遠端目標。
export async function verifyEmployeeSmoke(request, { tokens, staffMemberId, email }) {
  assert.equal((await request('list')).status, 401)
  const created = await request('create', tokens.super_admin, { name: 'M4 合成驗收', email })
  assert.equal(created.status, 200)
  const row = created.data
  assert.ok(Number.isSafeInteger(row.id))
  assert.equal(row.user_id, null)
  assert.ok(!/password|token_hash/.test(JSON.stringify(row)))
  const updated = await request('update', tokens.manager, { id: row.id, phone: '0900000000' })
  assert.equal(updated.status, 200)
  assert.equal(updated.data.phone, '0900000000')
  assert.equal((await request('update', tokens.manager, { id: row.id, role: 'manager' })).status, 403)
  assert.equal((await request('delete', tokens.manager, { id: row.id })).status, 403)
  const own = await request('list', tokens.staff)
  assert.equal(own.status, 200)
  assert.deepEqual(own.data.map(e => e.id), [staffMemberId])
  assert.equal((await request('update', tokens.staff, { id: row.id, phone: 'bad' })).status, 404)
  assert.equal((await request('update', tokens.staff, { id: staffMemberId, phone: '' })).status, 200)
  assert.equal((await request('update', tokens.staff, { id: staffMemberId, role: 'manager' })).status, 400)
  assert.equal((await request('delete', tokens.super_admin, { id: staffMemberId })).status, 409)
  const removed = await request('delete', tokens.super_admin, { id: row.id })
  // 已存在業務歷史表的環境允許保守拒絕，但不能回報刪除成功。
  assert.ok([200, 409].includes(removed.status))
  if (removed.status === 200) assert.equal(removed.data.success, true)
  else assert.equal(removed.data.error?.code, 'EMPLOYEE_IN_USE')
  return { deletion: removed.status === 200 ? 'deleted' : 'protected' }
}
