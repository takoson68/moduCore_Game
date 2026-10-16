<script setup>
import { computed, reactive, watch } from "vue";
import world from '@/world.js'
import { employeeService } from "../services/employeeService.js";

const employeeStore = world.store("employeeStore");
const authStore = world.store("auth");

const open = computed(() => employeeStore.state.editorOpen);
const editingEmployee = computed(() => employeeStore.state.editingEmployee);
const isCreate = computed(() => !editingEmployee.value);
const saving = reactive({ active: false, error: '' });
const canManage = computed(() => ["super_admin", "manager"].includes(authStore.state.user?.role));

const form = reactive({
  name: "",
  title: "",
  department: "",
  email: "",
  phone: "",
  role: "staff",
  status: "active",
});

const roleOptions = computed(() => [
  { value: "staff", label: "員工" },
  { value: "manager", label: "主管" },
  { value: "super_admin", label: "管理員職能（不變更登入權限）" },
].filter(r => authStore.state.user?.role === 'super_admin' || r.value === 'staff'));

const statusOptions = [
  { value: "active", label: "啟用" },
  { value: "inactive", label: "停用" },
];

const titleText = computed(() => (editingEmployee.value ? "編輯員工" : "新增員工"));
const actionLabel = computed(() => (editingEmployee.value ? "更新" : "建立"));

function syncForm(emp) {
  const base = {
    name: "",
    title: "",
    department: "",
    email: "",
    phone: "",
    role: "staff",
    status: "active",
  };
  Object.assign(form, { ...base, ...(emp || {}) });
}

watch(
  () => editingEmployee.value,
  (emp) => {
    if (open.value) syncForm(emp);
  },
  { immediate: true }
);

watch(
  () => open.value,
  (isOpen) => {
    if (isOpen) syncForm(editingEmployee.value);
  }
);

async function handleSubmit() {
  if (saving.active) return;
  if (!canManage.value) {
    alert("權限不足");
    return;
  }

  if (!form.name.trim() || !form.email.trim()) {
    alert("請填寫姓名與 Email");
    return;
  }

  const payload = {
    id: editingEmployee.value?.id,
    name: form.name.trim(),
    title: form.title.trim(),
    department: form.department.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    role: form.role,
    status: form.status,
  };

  saving.active = true;
  saving.error = '';
  try {
    if (payload.id) {
      const { id, ...body } = payload;
      await employeeService.update(id, body);
    } else {
      const { id, ...body } = payload;
      await employeeService.create(body);
    }
    employeeStore.closeEditor();
  } catch (err) {
    saving.error = err.message || '儲存失敗';
  } finally {
    saving.active = false;
  }
}

function close() {
  employeeStore.closeEditor();
}
</script>

<template lang="pug">
teleport(to="body")
  .editor-wrap(v-if="open" @click.self="close")
    .panel
      .panel-header
        .titles
          p.kicker Employee Center
          h3 {{ titleText }}
          p.subtitle 管理與維護員工資料，快速建立或更新人員
        button.close-btn(type="button" @click="close") X

      form.panel-body(@submit.prevent="handleSubmit")
        .form-grid
          label.field
            span.label 姓名
            input(v-model="form.name" type="text" placeholder="輸入姓名")
          label.field
            span.label 職稱
            input(v-model="form.title" type="text" placeholder="例如：工程師")
          label.field
            span.label 部門
            input(v-model="form.department" type="text" placeholder="例如：研發部")
          label.field
            span.label Email
            input(v-model="form.email" type="email" placeholder="name@email.com")
          label.field
            span.label 電話
            input(v-model="form.phone" type="text" placeholder="0900-000-000")
          label.field
            span.label 角色
            select(v-model="form.role")
              option(v-for="r in roleOptions" :key="r.value" :value="r.value") {{ r.label }}
          label.field
            span.label 狀態
            select(v-model="form.status")
              option(v-for="s in statusOptions" :key="s.value" :value="s.value") {{ s.label }}
        p 新增員工不會建立登入帳戶；員工角色與狀態不會變更登入權限。
        p(v-if="saving.error" role="alert") {{ saving.error }}

        .footer
          button.ghost(type="button" @click="close") 取消
          button.primary(type="submit" :disabled="saving.active") {{ saving.active ? '儲存中…' : actionLabel }}
</template>

<style scoped lang="sass">
@use '@project/styles/sass/vars' as *

*
  box-sizing: border-box

.editor-wrap
  position: fixed
  inset: 0
  background: color-mix(in srgb, var(--text) 18%, transparent)
  backdrop-filter: blur(2px)
  display: flex
  justify-content: flex-end
  z-index: 20

.panel
  width: min(520px, 90vw)
  height: 100%
  background: linear-gradient(175deg, var(--sys-1), color-mix(in srgb, var(--primary) 12%, var(--sys-1)))
  color: $txtColor
  box-shadow: -16px 0 28px rgba(12, 27, 61, 0.35)
  border-left: 1px solid $borderColor
  display: flex
  flex-direction: column
  animation: slide-in .25s ease

@keyframes slide-in
  from
    transform: translateX(12px)
    opacity: 0
  to
    transform: translateX(0)
    opacity: 1

.panel-header
  display: flex
  align-items: flex-start
  justify-content: space-between
  padding: 24px
  border-bottom: 1px solid $borderColor

.titles h3
  margin: 4px 0 6px 0
  font-size: 22px

.titles .kicker
  margin: 0
  letter-spacing: 0.08em
  text-transform: uppercase
  color: $primaryColor
  font-size: 12px
  font-weight: 700

.subtitle
  margin: 0
  color: $sys_9
  opacity: 0.86
  font-size: 13px

.close-btn
  border: none
  background: color-mix(in srgb, var(--primary) 10%, transparent)
  color: $txtColor
  width: 32px
  height: 32px
  border-radius: 10px
  cursor: pointer

.panel-body
  flex: 1
  padding: 20px 24px 24px
  display: flex
  flex-direction: column
  gap: 16px
  overflow-y: auto

.form-grid
  display: grid
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))
  gap: 14px 12px

.field
  display: flex
  flex-direction: column
  gap: 6px
  color: $txtColor

.label
  font-size: 13px
  color: $sys_9

input, select
  width: 100%
  padding: 10px 12px
  border-radius: 10px
  border: 1px solid $borderColor
  background: color-mix(in srgb, var(--sys-1) 92%, var(--primary) 8%)
  color: $txtColor
  outline: none
  transition: border 0.15s ease

input:focus, select:focus
  border-color: $primaryColor

.footer
  display: flex
  justify-content: flex-end
  gap: 10px
  padding-top: 10px
  border-top: 1px solid $borderColor

.ghost, .primary
  border-radius: 12px
  padding: 10px 16px
  cursor: pointer
  border: 1px solid transparent
  font-weight: 700

.ghost
  background: transparent
  color: $txtColor
  border-color: $borderColor

.primary
  background: linear-gradient(135deg, $primaryColor, $sys_4)
  color: $sys_1
  border: none

.ghost:hover, .primary:hover
  opacity: 0.92
</style>
