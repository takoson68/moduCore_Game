<!-- projects/project-b/layout/LayoutRoot.vue -->
<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import world from '@/world.js'
import ProjectTopbar from '../components/ProjectTopbar.vue'
import ProjectSidebar from '../components/ProjectSidebar.vue'

const authStore = world.store("auth")
const route = useRoute()
const router = useRouter()
const projectConfig = computed(() => world.projectConfig() || {})
const isLoggedIn = computed(() => authStore.isLoggedIn())
const mobileSidebarOpen = ref(false)

function toggleMobileSidebar() {
  if (!isLoggedIn.value) return
  mobileSidebarOpen.value = !mobileSidebarOpen.value
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
}

watch(() => route.fullPath, closeMobileSidebar)
// 只使用已註冊 Store，不引用模組私有服務。
watch(() => [authStore.state.user?.tenant_id, authStore.state.user?.id, authStore.state.user?.role].join(':'), () => {
  try { world.store('employeeStore').resetSession() } catch { /* 模組可缺席 */ }
}, { immediate: true, flush: 'sync' })
watch(isLoggedIn, (next) => {
  if (!next) {
    closeMobileSidebar()
    // Session 還原可能在首次 guard 之後完成；失去身份時離開專案受保護頁。
    const access = route.meta?.access || {}
    const isPublic = access.public ?? route.meta?.public
    const requiresAuth = access.auth ?? route.meta?.auth
    if (isPublic === false && requiresAuth === true) router.replace('/')
  }
})
</script>

<template lang="pug">
.shell
  .bg-grid
  ProjectTopbar(
    :project-config="projectConfig"
    :can-open-sidebar="isLoggedIn"
    :sidebar-open="mobileSidebarOpen"
    @toggle-sidebar="toggleMobileSidebar"
  )
  .main(:class="{ 'no-sidebar': !isLoggedIn }")
    button.sidebar-overlay(
      v-if="isLoggedIn && mobileSidebarOpen"
      type="button"
      aria-label="關閉側欄"
      @click="closeMobileSidebar"
    )
    .sidebar-drawer(
      v-if="isLoggedIn"
      id="project-b-sidebar"
      :class="{ 'is-open': mobileSidebarOpen }"
    )
      ProjectSidebar
    section.content
      RouterView
</template>

<style lang="sass">
.shell
  --project-b-topbar-height: 96px
  --project-b-shell-padding: 28px
  --project-b-sidebar-width: 240px
  --project-b-layout-gap: 20px
  --project-b-sidebar-edge-gap: 1em
  min-height: 100vh
  display: grid
  grid-template-rows: auto 1fr
  background: radial-gradient(1200px 600px at 10% 10%, rgba(34, 211, 238, 0.12), transparent 60%), linear-gradient(180deg, #f7fbff 0%, #eef5fb 100%)
  color: #0f172a
  position: relative
  overflow: auto
  height: 100vh

.bg-grid
  position: absolute
  inset: 0
  background-image: linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px)
  background-size: 28px 28px
  mask-image: radial-gradient(circle at 15% 20%, rgba(0, 0, 0, 0.5), transparent 70%)
  pointer-events: none

.main
  padding: 4em var(--project-b-shell-padding) var(--project-b-shell-padding)
  position: relative
  display: flex
  height: 100vh
  gap: var(--project-b-layout-gap)

.content
  min-width: 0
  display: flex
  flex: 1 1 auto
  margin-left: calc(var(--project-b-sidebar-width) + var(--project-b-layout-gap))

.main.no-sidebar .content
  margin-left: 0

.sidebar-drawer
  display: contents

@media (max-width: 960px)
  .main
    height: auto
    min-height: 100vh
    padding: 92px 14px 14px
    gap: 0

  .sidebar-overlay
    position: fixed
    inset: 0
    z-index: 10021
    border: 0
    margin: 0
    padding: 0
    background: rgba(15, 23, 42, 0.42)
    appearance: none

  .sidebar-drawer
    display: block
    position: fixed
    top: 0
    left: 0
    bottom: 0
    width: min(88vw, 320px)
    z-index: 10022
    transform: translateX(-100%)
    transition: transform 180ms ease
    pointer-events: none

  .sidebar-drawer.is-open
    transform: translateX(0)
    pointer-events: auto

  .sidebar-drawer .sidebar
    position: relative
    left: 0
    top: 0
    bottom: 0
    width: 100%
    max-width: none
    height: 100%
    min-height: 100vh
    border-radius: 0
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.24)

  .content
    margin-left: 0
    width: 100%
</style>
