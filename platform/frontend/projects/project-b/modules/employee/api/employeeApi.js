// modules/employee/api/employeeApi.js
import world from '@/world.js'

function clone(data) {
  try {
    return structuredClone(data);
  } catch (err) {
    return JSON.parse(JSON.stringify(data));
  }
}

function delay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const http = world.http();
const mode = world.apiMode();

let mockDB = [];

export const employeeApi = {
  async list() {
    if (mode === "real") {
      return http.get("/api/employees/list");
    }
    await delay();
    return clone(mockDB);
  },
  async create(payload) {
    if (mode === "real") {
      return http.post("/api/employees/create", payload);
    }
    await delay();
    const nextId = mockDB.reduce((max, e) => Math.max(max, e.id), 0) + 1;
    const { password, password_hash, ...safePayload } = payload;
    const employee = {
      id: nextId,
      status: "active",
      ...safePayload,
    };
    mockDB = [...mockDB, employee];
    return clone(employee);
  },
  async update(id, payload) {
    if (mode === "real") {
      return http.post("/api/employees/update", { id, ...payload });
    }
    await delay();
    const { password, password_hash, ...safePayload } = payload;
    mockDB = mockDB.map((e) => (e.id === id ? { ...e, ...safePayload } : e));
    return clone(mockDB.find((e) => e.id === id));
  },
  async remove(id) {
    if (mode === "real") {
      return http.post("/api/employees/delete", { id });
    }
    await delay();
    mockDB = mockDB.filter((e) => e.id !== id);
    return { success: true };
  },
};

export function resetMockEmployee() {
  mockDB = [];
}
