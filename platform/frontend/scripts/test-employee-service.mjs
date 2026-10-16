import assert from 'node:assert/strict'
import { test } from 'node:test'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'

// 載入實際模組服務，以受控 API 與 Store 驗證資料邊界。
async function setup(response) {
  const state = { list: [], sessionEpoch: 0 }
  const auth = { state: { user: { id: 3 } } }
  const store = { state, setList(rows) { state.list = rows }, addEmployee(row) { state.list.push(row) },
    updateEmployee(id, row) { state.list = state.list.map(r => r.id === id ? row : r) },
    removeEmployee(id) { state.list = state.list.filter(r => r.id !== id) } }
  const world = { store: name => name === 'auth' ? auth : store }
  const api = { list: async () => typeof response === 'function' ? response() : response }
  const context = vm.createContext({})
  const source = new vm.SourceTextModule(await readFile(new URL('../projects/project-b/modules/employee/services/employeeService.js', import.meta.url), 'utf8'), { context })
  await source.link(async name => {
    const key = name.includes('world') ? 'default' : 'employeeApi'
    return new vm.SyntheticModule([key], function () { this.setExport(key, key === 'default' ? world : api) }, { context })
  })
  await source.evaluate()
  return { service: source.namespace.employeeService, state, auth }
}

test('員工清單成功才寫入 Store，密碼與雜湊不進入資料', async () => {
  const { service, state } = await setup({ ok: true, data: [{ id: 11, user_id: 3, password: 'synthetic', password_hash: 'synthetic', name: '合成' }] })
  await service.fetchList()
  assert.equal(state.list[0].id, 11)
  assert.ok(!JSON.stringify(state.list).includes('synthetic'))
})
test('HTTP 錯誤與非陣列回應不能假裝成功空表', async () => {
  for (const response of [{ ok: false, status: 403, data: { message: 'SQL private' } }, { ok: true, data: {} }]) {
    const { service, state } = await setup(response)
    await assert.rejects(() => service.fetchList(), error => !error.message.includes('SQL'))
    assert.equal(state.list.length, 0)
  }
})
test('登出後延遲回應不回填員工資料', async () => {
  let resolve
  const { service, state, auth } = await setup(() => new Promise(r => { resolve = r }))
  const pending = service.fetchList()
  state.sessionEpoch++
  auth.state.user = null
  resolve({ ok: true, data: [{ id: 11 }] })
  await assert.rejects(() => pending, /身份已變更/)
  assert.equal(state.list.length, 0)
})

test('員工 Store 不啟用持久化，身份重設清除個資與舊儲存鍵', async () => {
  let options, removed
  const world = { createStore(config) { options = config; return config } }
  const context = vm.createContext({ window: { localStorage: { removeItem(key) { removed = key } } } })
  const source = new vm.SourceTextModule(await readFile(new URL('../projects/project-b/modules/employee/store.js', import.meta.url), 'utf8'), { context })
  await source.link(() => new vm.SyntheticModule(['default'], function () { this.setExport('default', world) }, { context }))
  await source.evaluate()
  source.namespace.createEmployeeStore()
  assert.equal(options.storageKey, undefined)
  const store = { state: { sessionEpoch: 4 }, set(value) { this.state = value } }
  options.actions.resetSession(store)
  assert.equal(store.state.list.length, 0)
  assert.equal(store.state.editingEmployee, null)
  assert.equal(store.state.sessionEpoch, 5)
  assert.equal(removed, 'employeeStore')
})
