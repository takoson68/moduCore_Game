<!-- project-b 專屬登入面板，登入真相由平台 Auth API 與 Store 維護。 -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import world from '@/world.js'

const router = useRouter()
const authStore = world.store("auth")
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const isOpen = ref(false)

const user = computed(() => authStore.state.user)
const isLoggedIn = computed(() => authStore.isLoggedIn())

// 只顯示安全的錯誤文案，不直接呈現例外或後端原始訊息。
function failureMessage(status, fallback) {
  if (status === 429) return '操作過於頻繁，請稍後再試'
  if (status === 403) return '專案識別不符，請確認目前網站'
  return fallback
}

// 掛載時透過平台還原 Session；無論失敗原因都解除忙碌狀態。
async function restoreSession() {
  if (loading.value) return
  loading.value = true
  error.value = ''

  try {
    const result = await world.authApi().restoreSession()
    if (!result.ok || result.data?.success === false) {
      error.value = failureMessage(result.status, '登入狀態確認失敗，請重新登入')
    }
  } catch {
    error.value = '無法連線確認登入狀態，請稍後再試'
  } finally {
    loading.value = false
  }
}

// 不修剪密碼、不自行寫入身份，僅在完整登入回應後關閉面板。
async function handleLogin() {
  if (loading.value) return
  if (!username.value.trim() || !password.value) {
    error.value = '請填寫帳號與密碼'
    return
  }
  loading.value = true
  error.value = ''

  try {
    const payload = { username: username.value.trim(), password: password.value }
    const { ok, data, status } = await world.authApi().login(payload)
    if (!ok || data?.success === false) {
      error.value = failureMessage(status, status === 401 ? '帳號或密碼錯誤' : '登入失敗，請稍後再試')
      return
    }
    if (!data?.user || !data?.token) {
      error.value = '登入回應不完整，請稍後再試'
      return
    }
    isOpen.value = false
  } catch {
    error.value = '無法連線登入，請稍後再試'
  } finally {
    password.value = ''
    loading.value = false
  }
}

// 等待伺服器確認撤銷，失敗時不顯示已完成登出。
async function handleLogout() {
  if (loading.value) return
  loading.value = true
  error.value = ''

  try {
    const result = await world.authApi().logout()
    if (!result.ok || result.data?.success === false) {
      error.value = failureMessage(result.status, '伺服器尚未確認登出，請稍後再試')
      return
    }
    await router.replace('/')
  } catch {
    error.value = '無法連線確認登出，請稍後再試'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  restoreSession()
})
</script>

<template lang="pug">
.platform-login-panel
  //- .panel-status
    //- span.status-pill(:class="{ active: isLoggedIn }")
      | {{ isLoggedIn ? '已登入' : '未登入' }}
    span.status-text(v-if="user") {{ user.name }}

  .panel-actions
    .login-anchor
      button.action-btn(
        v-if="!isLoggedIn"
        type="button"
        @click="isOpen = !isOpen"
        :disabled="loading"
      ) 登入
      button.action-btn.outline(
        v-else
        type="button"
        @click="handleLogout"
        :disabled="loading"
      ) 
        span.status-text(v-if="user") {{ user.name }} 
        |{{ loading ? ' 處理中...' : ' / 登出' }}

    Teleport(to="body")
      .login-popover(v-if="isOpen && !isLoggedIn")
        h3.login-title 平台登入
        p.login-subtitle 請使用管理員提供的帳號登入
        form.login-form(@submit.prevent="handleLogin")
          input.input-field(
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="帳號"
            required
            :disabled="loading"
          )
          input.input-field(
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="密碼"
            required
            :disabled="loading"
          )
          .login-actions
            button.action-btn.outline(type="button" @click="isOpen = false") 關閉
            button.action-btn(type="submit" :disabled="loading")
              | {{ loading ? '登入中...' : '登入' }}
        p.panel-message.error(v-if="error" role="alert") {{ error }}

  
      .login-overlay(v-if="isOpen && !isLoggedIn" @click.self="isOpen = false")

  p.panel-message.error(v-if="error && !isOpen" role="alert") {{ error }}

</template>

<style scoped lang="sass">
.platform-login-panel
  display: flex
  gap: 8px
  align-items: center
  justify-content: end
  // min-width: 220px
  flex-direction: row

.panel-status
  display: flex
  align-items: center
  gap: 8px

.status-pill
  padding: 4px 10px
  border-radius: 999px
  border: 1px solid #e2e8f0
  background: #f8fafc
  font-size: 11px
  font-weight: 700
  color: #475569

.status-pill.active
  border-color: #0f172a
  background: #0f172a
  color: #fff

.status-text
  font-size: 12px
  color: #334155
  font-weight: 600

.panel-form
  display: grid
  grid-template-columns: minmax(120px, 1fr) minmax(120px, 1fr) auto
  gap: 6px
  align-items: center

.input-field
  padding: 8px 10px
  border-radius: 10px
  border: 1px solid #e2e8f0
  background: #fff
  font-size: 12px

.action-btn
  padding: 8px 12px
  border-radius: 10px
  border: 1px solid #0f172a
  background: #0f172a
  color: #fff
  font-size: 12px
  font-weight: 700
  cursor: pointer

.action-btn.outline
  background: transparent
  color: #0f172a

.action-btn:disabled
  opacity: 0.6
  cursor: not-allowed

.panel-actions
  display: flex
  justify-content: flex-end

.panel-message
  margin: 0
  font-size: 11px

.panel-message.error
  color: #b91c1c

.panel-message.info
  color: #1d4ed8

.login-anchor
  position: relative
  z-index: 10001

.login-overlay
  position: fixed
  inset: 0
  background: rgba(15, 23, 42, 0.45)
  z-index: 10000

.login-popover
  position: fixed
  top: 64px
  right: 16px
  width: min(320px, 92vw)
  height: auto
  max-height: 70vh
  display: flex
  flex-direction: column
  gap: 12px
  padding: 16px
  border-radius: 16px
  border: 1px solid rgba(15, 23, 42, 0.12)
  background: #fff
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16)
  overflow: auto
  z-index: 10002

.login-title
  margin: 0
  font-size: 18px
  font-weight: 700
  color: #0f172a

.login-subtitle
  margin: 0
  font-size: 12px
  color: #64748b

.login-form
  display: flex
  flex-direction: column
  gap: 10px

.login-form input
  width: 100%
  min-height: 40px

.login-actions
  display: flex
  justify-content: flex-end
  gap: 8px
</style>
