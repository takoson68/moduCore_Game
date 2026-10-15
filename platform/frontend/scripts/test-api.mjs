// 隔離容器及網路，驗證實際 API 入口不再將 Session Token 放入 URL。
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const requests = []
const token = 'synthetic-token'
const stores = {
  token: { getToken: () => token, setToken() {} },
  auth: { login() {}, logout() {} },
}
const context = vm.createContext({
  fetch: async (url, options) => {
    requests.push({ url, options })
    return { ok: true, status: 200, json: async () => ({
      success: true, authenticated: true, user: { id: 1 }, token,
    }) }
  },
})
const entry = new vm.SourceTextModule(await readFile(new URL('../src/app/api/index.js', import.meta.url), 'utf8'), { context })
await entry.link(specifier => {
  let values
  if (specifier === '../container/container.js') values = { container: { resolve: name => stores[name] } }
  else if (specifier === './client.js') values = { createClient() {} }
  else if (specifier === './http.js') values = { http: {} }
  else if (specifier === './mockSwitch.js') values = { useMock() {} }
  else throw new Error(`未預期的測試依賴：${specifier}`)
  return new vm.SyntheticModule(Object.keys(values), function () {
    for (const [name, value] of Object.entries(values)) this.setExport(name, value)
  }, { context })
})
await entry.evaluate()
entry.namespace.initApi({ projectName: 'project-b' })
await entry.namespace.authApi.session()
await entry.namespace.authApi.restoreSession()
await entry.namespace.apiRequest('/api/example?filter=test', { tokenQuery: true })
for (const request of requests) {
  assert.ok(!request.url.includes('token='))
  assert.equal(request.options.headers.Authorization, `Bearer ${token}`)
  assert.equal(request.options.headers['X-Project'], 'project-b')
}
assert.equal(requests.length, 3)
console.log('Session、還原 Session 與舊 tokenQuery 呼叫均只以 Header 傳遞 Token：3/3 通過')
