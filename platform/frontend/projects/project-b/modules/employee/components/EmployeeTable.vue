<script setup>
import { computed, ref, watch } from "vue";
import world from '@/world.js'
import { employeeService } from "../services/employeeService.js";

const employeeStore = world.store("employeeStore");
const authStore = world.store('auth');
const busy = ref(false);
const error = ref('');
const deleting = ref(null);
// 畫面只控制操作可見性，最終授權仍由 Worker 判斷。
function canEdit(employee) {
  return authStore.state.user?.role === 'super_admin' ||
    employee.role === 'staff';
}
const emit = defineEmits([]);
const props = defineProps({
  showRole: { type: Boolean, default: false },
});

const pageSize = ref(10);
const page = ref(1);

const employees = computed(() => {
  const keyword = employeeStore.state.search.trim().toLowerCase();
  if (!keyword) return employeeStore.state.list;
  return employeeStore.state.list.filter((e) => {
    return (
      e.name.toLowerCase().includes(keyword) ||
      (e.title || "").toLowerCase().includes(keyword) ||
      (e.department || "").toLowerCase().includes(keyword) ||
      (e.email || "").toLowerCase().includes(keyword) ||
      (e.phone || "").toLowerCase().includes(keyword)
    );
  });
});

const totalPages = computed(() => {
  const total = employees.value.length;
  return Math.max(1, Math.ceil(total / pageSize.value));
});

const pagedEmployees = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return employees.value.slice(start, start + pageSize.value);
});

watch(
  () => [employees.value.length, pageSize.value, employeeStore.state.search],
  () => {
    page.value = 1;
  }
);

function prevPage() {
  page.value = Math.max(1, page.value - 1);
}

function nextPage() {
  page.value = Math.min(totalPages.value, page.value + 1);
}

function avatarInitial(name) {
  return name?.trim().charAt(0).toUpperCase() || "?";
}

function statusStyle(status) {
  const isActive = status === "active";
  const base = isActive ? "--sys-6" : "--sys-8";
  const color = `var(${base})`;
  return {
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    color: isActive ? "var(--sys-6)" : "var(--sys-8)",
    border: `1px solid ${color}`,
  };
}

function roleLabel(role) {
  if (role === "super_admin") return "平台";
  if (role === "manager") return "主管";
  return "員工";
}

function handleEdit(employee) {
  employeeStore.openEdit(employee);
}

async function handleDelete(employee) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await employeeService.remove(employee.id);
    deleting.value = null;
  } catch (err) {
    error.value = err.message || '刪除失敗';
  } finally {
    busy.value = false;
  }
}
</script>

<template lang="pug">
.table(:class="{ 'with-role': showRole }")
  p(v-if="error" role="alert") {{ error }}
  .delete-confirm(v-if="deleting" role="alert")
    p 確定刪除 {{ deleting.name }}？有帳戶或歷史關聯時無法刪除。
    button(type="button" :disabled="busy" @click="handleDelete(deleting)") 確認刪除
    button(type="button" :disabled="busy" @click="deleting = null") 取消刪除
  .thead
    .cell 姓名 / 職稱
    .cell 部門
    .cell Email
    .cell 電話
    .cell 狀態
    .cell(v-if="showRole") 角色
    .cell.more 操作

  .tbody
    .row(v-for="e in pagedEmployees" :key="e.id")
      .cell.name
        .avatar
          span.initial {{ avatarInitial(e.name) }}
        .info
          p.title {{ e.name }}
          p.handle {{ e.title }}
      .cell {{ e.department || '未設定' }}
      .cell {{ e.email }}
      .cell {{ e.phone || '-' }}
      .cell
        span.chip(:style="statusStyle(e.status)") {{ e.status === 'active' ? '啟用' : '停用' }}
      .cell(v-if="showRole") {{ roleLabel(e.role) }}
      .cell.more
        button.icon-btn(v-if="canEdit(e)" @click="handleEdit(e)" title="編輯") ✏️
        button.icon-btn.danger(v-if="authStore.state.user?.role === 'super_admin' && e.user_id == null" :disabled="busy" @click="deleting = e" title="刪除") 🗑️

  .pagination
    .page-size
      span.label 每頁
      select(v-model.number="pageSize")
        option(:value="5") 5
        option(:value="10") 10
        option(:value="20") 20
      span.label 筆
    .page-info 第 {{ page }} / {{ totalPages }} 頁
    .page-actions
      button.ghost(type="button" @click="prevPage" :disabled="page <= 1") 上一頁
      button.ghost(type="button" @click="nextPage" :disabled="page >= totalPages") 下一頁
</template>

<style scoped lang="sass">
@use '@project/styles/sass/vars' as *

*
  box-sizing: border-box

.table
  width: 100%
  border: 1px solid $borderColor
  border-radius: 16px
  background: $sys_1
  box-shadow: 0 10px 28px rgba(16,40,89,0.08)
  overflow: auto

.thead, .row
  display: grid
  grid-template-columns: 1.5fr 1.1fr 1.6fr 1.1fr 0.9fr 0.9fr
  align-items: center

.thead
  background: $sysBg
  color: $primaryColor
  font-weight: 700
  padding: 14px 18px
  position: sticky
  top: 0
  z-index: 2
  border-bottom: 1px solid $primaryColor

.tbody
  display: flex
  flex-direction: column

.row
  padding: 14px 18px
  border-top: 1px solid $borderColor
  color: $txtColor
  font-size: 14px

  &:hover
    background: $sysBg

.cell
  display: flex
  align-items: center
  gap: 10px
  padding: .25em

.cell.name
  gap: 12px

.avatar
  position: relative
  width: 42px
  height: 42px
  border-radius: 12px
  overflow: hidden
  background: linear-gradient(145deg, $primaryColor, $sys_4)
  color: $sys_1
  display: grid
  place-items: center
  font-weight: 700

.avatar .initial
  font-size: 16px

.info
  display: flex
  flex-direction: column
  gap: 3px

.info .title
  margin: 0
  font-weight: 700
  color: $txtColor

.info .handle
  margin: 0
  color: $sys_9
  font-size: 13px

.chip
  padding: 6px 10px
  border-radius: 10px
  font-weight: 700
  font-size: 12px

.more
  justify-content: center
  gap: 6px

.icon-btn
  width: 32px
  height: 32px
  border-radius: 10px
  border: 1px solid $borderColor
  background: $sysBg
  cursor: pointer
  display: grid
  place-items: center
  padding: 0
  line-height: 1
  font-size: 13px
  color: $txtColor

.icon-btn.danger
  color: $sys_8
  border-color: $sys_8
  background: color-mix(in srgb, var(--sys-8) 12%, var(--sys-1))

.table.with-role
  .thead, .row
    grid-template-columns: 1.4fr 1fr 1.3fr 1fr 0.8fr 0.9fr 0.9fr

.pagination
  display: flex
  justify-content: space-between
  align-items: center
  gap: 12px
  padding: 12px 18px
  border-top: 1px solid $borderColor
  background: $sysBg
  position: sticky 
  bottom: 0
.page-size
  display: flex
  align-items: center
  gap: 8px

.page-size select
  padding: 6px 10px
  border-radius: 8px
  border: 1px solid $borderColor
  background: $sys_1
  color: $txtColor

.page-info
  font-weight: 700
  color: $txtColor

.page-actions
  display: flex
  gap: 8px

.ghost
  height: 32px
  padding: 0 12px
  border-radius: 10px
  border: 1px solid $borderColor
  background: $sys_1
  color: $txtColor
  font-weight: 700
  cursor: pointer

.ghost:disabled
  opacity: 0.5
  cursor: not-allowed
</style>
