//- src/app/api/index.js
import { container } from '../container/container.js'

let projectName = null

export function initApi({ projectName: name } = {}) {
  if (typeof name === 'string' && name.trim()) {
    projectName = name.trim()
  }
}

function resolveStore(name) {
  try {
    return container.resolve(name)
  } catch (err) {
    return null
  }
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    requireProject = true
  } = options

  if (requireProject && !projectName) {
    throw new Error('[API] 缺少專案名稱')
  }

  const tokenStore = resolveStore('token')
  const authStore = resolveStore('auth')
  const token = tokenStore?.getToken?.()

  const requestHeaders = {
    ...headers,
  }

  if (requireProject) {
    requestHeaders['X-Project'] = projectName
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  const url = path

  let payload
  if (body !== undefined) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] ?? 'application/json'
    payload = typeof body === 'string' ? body : JSON.stringify(body)
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: payload
  })

  const data = await response.json().catch(() => ({}))

  if (response.status === 401) {
    authStore?.logout?.()
    tokenStore?.setToken?.(null)
  }

  return { ok: response.ok, status: response.status, data }
}

function applySession(authStore, tokenStore, data, fallbackToken) {
  if (data?.authenticated && data.user) {
    authStore?.login?.(data.user)
    tokenStore?.setToken?.(data.token || fallbackToken || null)
    return true
  }

  authStore?.logout?.()
  tokenStore?.setToken?.(null)
  return false
}

export const authApi = {
  async login(payload) {
    const result = await apiRequest('/api/login', { method: 'POST', body: payload })
    if (result.ok && result.data?.success !== false) {
      const authStore = resolveStore('auth')
      const tokenStore = resolveStore('token')
      applySession(authStore, tokenStore, {
        authenticated: true,
        user: result.data?.user,
        token: result.data?.token
      })
    }
    return result
  },
  async logout() {
    const result = await apiRequest('/api/logout', { method: 'POST' })
    const authStore = resolveStore('auth')
    const tokenStore = resolveStore('token')
    authStore?.logout?.()
    tokenStore?.setToken?.(null)
    return result
  },
  async session() {
    return apiRequest('/api/session')
  },
  async restoreSession() {
    const tokenStore = resolveStore('token')
    const authStore = resolveStore('auth')
    const token = tokenStore?.getToken?.()
    if (!token) return { ok: true, status: 204, data: null }

    const result = await apiRequest('/api/session')
    applySession(authStore, tokenStore, result.data, token)
    return result
  }
}

export { createClient } from './client.js'
export { http } from './http.js'
export { useMock } from './mockSwitch.js'
