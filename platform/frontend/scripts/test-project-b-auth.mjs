// 執行實際面板 script setup，隔離 Vue／Router／API；此測試不代表瀏覽器整合驗收。
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('../projects/project-b/components/PlatformLoginPanel.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1]

// 每個案例建立獨立狀態，平台 Store 不提供直接登入／登出方法，防止 UI 繞過 API。
async function panel(overrides = {}) {
  const calls = [], routes = []
  const api = {
    login: async payload => { calls.push(payload); return { ok: true, data: { success: true, user: { id: 1 }, token: 'synthetic-token' } } },
    restoreSession: async () => ({ ok: true, status: 204, data: null }),
    logout: async () => ({ ok: true, data: { success: true } }),
    ...overrides,
  }
  const context = vm.createContext({})
  const entry = new vm.SourceTextModule(`${script}\nexport { username, password, loading, error, isOpen, restoreSession, handleLogin, handleLogout };`, { context })
  await entry.link(specifier => {
    let values
    if (specifier === 'vue') values = { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), onMounted() {} }
    else if (specifier === 'vue-router') values = { useRouter: () => ({ replace: async path => { routes.push(path) } }) }
    else if (specifier === '@/world.js') values = { default: { store: () => ({ state: { user: null }, isLoggedIn: () => false }), authApi: () => api } }
    else throw new Error('未預期的面板依賴')
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value)
    }, { context })
  })
  await entry.evaluate()
  return { p: entry.namespace, calls, routes }
}

test('初始帳密為空，無示範帳密提示，錯誤可在面板關閉時呈現', async () => {
  const { p } = await panel()
  assert.equal(p.username.value, '')
  assert.equal(p.password.value, '')
  assert.ok(!/使用測試帳密|demo123/.test(source))
  assert.match(source, /p\.panel-message\.error\(v-if="error" role="alert"\)/)
  assert.match(source, /v-if="error && !isOpen" role="alert"/)
})

test('空帳密不送出 API，成功只透過平台登入並保留密碼空白語意', async () => {
  const { p, calls } = await panel()
  await p.handleLogin()
  assert.equal(calls.length, 0)
  assert.equal(p.error.value, '請填寫帳號與密碼')
  p.username.value = ' user '
  p.password.value = ' password '
  p.isOpen.value = true
  await p.handleLogin()
  assert.equal(calls[0].username, 'user')
  assert.equal(calls[0].password, ' password ')
  assert.equal(p.password.value, '')
  assert.equal(p.loading.value, false)
  assert.equal(p.isOpen.value, false)
})

for (const [status, message] of [[401, '帳號或密碼錯誤'], [429, '操作過於頻繁，請稍後再試'], [403, '專案識別不符，請確認目前網站'], [500, '登入失敗，請稍後再試']]) {
  test(`登入 HTTP ${status} 安全回應且解除 loading`, async () => {
    const { p } = await panel({ login: async () => ({ ok: false, status, data: { message: 'SQL sensitive-internal' } }) })
    p.username.value = 'synthetic-user'
    p.password.value = 'synthetic-password'
    p.isOpen.value = true
    await p.handleLogin()
    assert.equal(p.error.value, message)
    assert.equal(p.loading.value, false)
    assert.equal(p.password.value, '')
    assert.equal(p.isOpen.value, true)
  })
}

test('登入網路例外與不完整成功回應不關閉面板、不洩漏原始錯誤', async () => {
  for (const login of [async () => { throw new Error('private-detail') }, async () => ({ ok: true, data: null })]) {
    const { p } = await panel({ login })
    p.username.value = 'synthetic-user'
    p.password.value = 'synthetic-password'
    p.isOpen.value = true
    await p.handleLogin()
    assert.equal(p.loading.value, false)
    assert.equal(p.isOpen.value, true)
    assert.ok(p.error.value && !p.error.value.includes('private-detail'))
  }
})

test('忙碌時拒絕重複送出登入、還原與登出', async () => {
  let called = false
  const fail = async () => { called = true; throw new Error('不應呼叫') }
  const { p } = await panel({ login: fail, logout: fail, restoreSession: fail })
  p.loading.value = true
  await p.handleLogin()
  await p.handleLogout()
  await p.restoreSession()
  assert.equal(called, false)
})

test('Session 匿名／無 Token 可正常結束，HTTP 或網路失敗解除 loading', async () => {
  for (const restoreSession of [async () => ({ ok: true, status: 204, data: null }),
    async () => ({ ok: true, data: { success: true, authenticated: false } }),
    async () => ({ ok: false, status: 503 }), async () => { throw new Error('private-detail') }]) {
    const { p } = await panel({ restoreSession })
    await p.restoreSession()
    assert.equal(p.loading.value, false)
    assert.ok(!p.error.value.includes('private-detail'))
  }
})

test('登出只在 API 確認成功後導回首頁，HTTP 與網路失敗可見且解除 loading', async () => {
  const success = await panel()
  await success.p.handleLogout()
  assert.deepEqual(success.routes, ['/'])
  for (const logout of [async () => ({ ok: false, status: 500 }), async () => { throw new Error('private-detail') }]) {
    const { p, routes } = await panel({ logout })
    await p.handleLogout()
    assert.equal(p.loading.value, false)
    assert.equal(routes.length, 0)
    assert.ok(p.error.value && !p.error.value.includes('private-detail'))
  }
})

test('project-b Layout 失去登入時離開受保護頁，公開頁不跳轉', async () => {
  const layout = await readFile(new URL('../projects/project-b/layout/LayoutRoot.vue', import.meta.url), 'utf8')
  const layoutScript = layout.match(/<script setup>([\s\S]*?)<\/script>/)[1]
  for (const access of [{ public: false, auth: true }, { public: true, auth: true }]) {
    const watchers = [], routes = []
    const context = vm.createContext({})
    const entry = new vm.SourceTextModule(layoutScript, { context })
    await entry.link(specifier => {
      let values
      if (specifier === 'vue') values = {
        ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }),
        watch: (_source, callback) => watchers.push(callback),
      }
      else if (specifier === 'vue-router') values = {
        useRoute: () => ({ fullPath: '/employee', meta: { access } }),
        useRouter: () => ({ replace: path => { routes.push(path) } }),
      }
      else if (specifier === '@/world.js') values = { default: {
        store: () => ({ isLoggedIn: () => true }), projectConfig: () => ({}),
      } }
      else if (specifier.endsWith('.vue')) values = { default: {} }
      else throw new Error('未預期的 Layout 依賴')
      return new vm.SyntheticModule(Object.keys(values), function () {
        for (const [key, value] of Object.entries(values)) this.setExport(key, value)
      }, { context })
    })
    await entry.evaluate()
    watchers.at(-1)(false)
    assert.deepEqual(routes, access.public ? [] : ['/'])
  }
})
