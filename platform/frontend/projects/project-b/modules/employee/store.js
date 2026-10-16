import world from '@/world.js'

export function createEmployeeStore() {
  return world.createStore({
    name: "employeeStore",
    // 員工個資僅保留記憶體，不載入舊持久化清單。
    defaultValue: {
      list: [],
      search: "",
      editorOpen: false,
      editingEmployee: null,
      sessionEpoch: 0,
    },
    actions: {
      resetSession(store) {
        store.set({ list: [], search: '', editorOpen: false, editingEmployee: null,
          sessionEpoch: store.state.sessionEpoch + 1 });
        try { window.localStorage.removeItem('employeeStore'); } catch { /* 儲存空間可能不可用 */ }
      },
      setSearch(store, text) {
        const state = store.get();
        store.set({ ...state, search: text });
      },
      openCreate(store) {
        const state = store.get();
        store.set({ ...state, editorOpen: true, editingEmployee: null });
      },
      openEdit(store, employee) {
        const state = store.get();
        store.set({
          ...state,
          editorOpen: true,
          editingEmployee: employee ? { ...employee } : null,
        });
      },
      closeEditor(store) {
        const state = store.get();
        store.set({ ...state, editorOpen: false, editingEmployee: null });
      },
      setList(store, list = []) {
        const state = store.get();
        store.set({ ...state, list: normalizeList(list) });
      },
      addEmployee(store, payload) {
        const state = store.get();
        const employee = normalizeEmployee(payload);
        store.set({ ...state, list: [...state.list, employee] });
      },
      updateEmployee(store, id, payload) {
        const current = store.get();
        const list = current.list.map((emp) =>
          emp.id === id ? normalizeEmployee({ ...emp, ...payload }) : emp
        );
        store.set({ ...current, list });
      },
      removeEmployee(store, id) {
        const state = store.get();
        const list = state.list.filter((emp) => emp.id !== id);
        const isEditingTarget = state.editingEmployee?.id === id;
        store.set({
          ...state,
          list,
          editingEmployee: isEditingTarget ? null : state.editingEmployee,
          editorOpen: isEditingTarget ? false : state.editorOpen,
        });
      },
    },
  });
}

function normalizeEmployee(employee, fallback = {}) {
  const merged = {
    status: "active",
    department: "",
    phone: "",
    ...fallback,
    ...employee,
  };
  delete merged.password;
  delete merged.password_hash;
  return merged;
}

function normalizeList(list = []) {
  if (!Array.isArray(list)) return [];
  return list.map((e) => normalizeEmployee(e));
}
