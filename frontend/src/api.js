const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, { method = "GET", body, token, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  // ✅ Si la sesión ya no sirve, limpiamos localStorage y mandamos al login
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Evita loops si ya estás en login/register
    const p = window.location.pathname || "";
    if (!p.includes("/login") && !p.includes("/register")) {
      window.location.href = "/login";
    }

    const msg = data?.message || "Sesión expirada. Vuelve a iniciar sesión.";
    throw new Error(msg);
  }

  // ✅ 403: no tienes permisos (mostrar mensaje claro)
  if (res.status === 403) {
    const msg = data?.message || "No tienes permisos para acceder a esta sección.";
    throw new Error(msg);
  }

  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  auth: {
    login: (payload) => request("/auth/login", { method: "POST", body: payload }),
    register: (payload) => request("/auth/register", { method: "POST", body: payload }),
    me: (token) => request("/auth/me", { token }),
    forgot: (payload) => request("/auth/forgot-password", { method: "POST", body: payload }),
    reset: (payload) => request("/auth/reset-password", { method: "POST", body: payload }),
  },
  sections: {
    list: (token) => request("/sections", { token }),
    items: (sectionId, token) => request(`/sections/${sectionId}/items`, { token }),
  },
  runs: {
    create: (payload, token) => request("/check-runs", { method: "POST", body: payload, token }),
    status: (sectionId, token) => request(`/check-runs/status?section_id=${encodeURIComponent(sectionId)}`, { token }),
    my: (status, token) =>
      request(`/check-runs/me${status ? `?status=${encodeURIComponent(status)}` : ""}`, { token }),
    get: (id, token) => request(`/check-runs/${id}`, { token }),
    upsertEntry: (runId, formData, token) =>
      request(`/check-runs/${runId}/entries`, { method: "POST", body: formData, token, isForm: true }),
    submit: (id, token) => request(`/check-runs/${id}/submit`, { method: "POST", token }),
  },
  admin: {
    listRuns: (qs, token) => request(`/admin/check-runs${qs ? `?${qs}` : ""}`, { token }),
    reviewRun: (id, payload, token) =>
      request(`/admin/check-runs/${id}/review`, { method: "POST", body: payload, token }),
  
    // ✅ NUEVO
    deleteRun: (id, token) => request(`/admin/check-runs/${id}`, { method: "DELETE", token }),
  
    structure: (token) => request("/admin/structure", { token }),
    createSection: (payload, token) => request("/admin/sections", { method: "POST", body: payload, token }),
    updateSection: (id, payload, token) => request(`/admin/sections/${id}`, { method: "PUT", body: payload, token }),
    createItem: (payload, token) => request("/admin/items", { method: "POST", body: payload, token }),
    updateItem: (id, payload, token) => request(`/admin/items/${id}`, { method: "PUT", body: payload, token }),
  
    // ✅ DELETE normal
    deleteSection: (id, token) => request(`/admin/sections/${id}`, { method: "DELETE", token }),
    deleteItem: (id, token) => request(`/admin/items/${id}`, { method: "DELETE", token }),

    dashboardSummary: (token) => request("/admin/dashboard/summary", { token }),
  
    // ✅ DELETE FORZADO (borra entries + ítem)
    forceDeleteItem: (id, token) => request(`/admin/items/${id}?force=1`, { method: "DELETE", token }),
  
    users: (token) => request("/admin/users", { token }),
    setRole: (id, payload, token) => request(`/admin/users/${id}/role`, { method: "PUT", body: payload, token }),
  },
  
  
};


export const backendBase = (API_URL || "").replace(/\s*\/api\s*$/, "");
