import axios from "./vendor/axios.esm.js";

// -------------------- Axios Instance --------------------
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 5000,
  withCredentials: true,
});

// -------------------- Interceptor --------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    // Treat 401/403/404 gracefully for specific endpoints
    if ([401, 403, 404].includes(status)) {

      // Current user probe → guest
      if (url.includes("/auth/me")) {
        return Promise.resolve({ data: { user: null } });
      }

      // Permission check → no permission
      if (url.includes("/auth/permissions")) {
        return Promise.resolve({ data: { hasPermission: false } });
      }

      // Settings (admin-only on backend) → return empty object so UI won't crash
      if (url.includes("/settings")) {
        return Promise.resolve({ data: {} });
      }

      // Fallback for other cases we want to soft-fail
      return Promise.resolve({ data: null });
    }

    return Promise.reject(error);
  }
);

// -------------------- Local Cache Helper --------------------
async function fetchWithLocalCache(key, fetchFn, ttl = 300000) { // default 5 นาที
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttl) {
        return data;
      }
    }

    const data = await fetchFn();
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  } catch (err) {
    console.warn(`Local cache disabled for ${key}:`, err);
    return fetchFn();
  }
}

// -------------------- Products (Public) --------------------
export async function getProducts(limit = 10, offset = 0) {
  return fetchWithLocalCache(`products:${limit}:${offset}`, async () => {
    const res = await api.get("/products/public", { params: { limit, offset } });
    return res.data;
  });
}

// -------------------- Settings --------------------
export async function getSettings(lang = "en") {
  return fetchWithLocalCache(`settings:${lang}`, async () => {
    const res = await api.get("/settings", { params: { lang } });
    // If blocked or not available, ensure {} (interceptor already returns {} on 401/403/404)
    return res.data || {};
  });
}

export async function saveSettings(settings) {
  try {
    // แปลง object { lang, theme } → array [{ key, value, ... }]
    const payload = {
      settings: Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        type: "text",
        lang: settings.lang || "en",
      })),
    };

    const res = await api.post("/settings", payload);

    // invalidate local cache
    Object.keys(localStorage)
      .filter((key) => key.startsWith("settings:"))
      .forEach((key) => localStorage.removeItem(key));

    return res.data;
  } catch (err) {
    console.error("Error saving settings:", err);
    throw new Error(err.response?.data?.error || "Failed to save settings");
  }
}

// -------------------- Auth --------------------
export async function register(email, password, display_name) {
  try {
    const res = await api.post("/auth/register", { email, password, display_name });
    return res.data;
  } catch (err) {
    console.error("Register error:", err);
    throw new Error(err.response?.data?.error || "Registration failed");
  }
}

export async function login(email, password) {
  try {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
  } catch (err) {
    console.error("Login error:", err);
    throw new Error(err.response?.data?.error || "Login failed");
  }
}

export async function logout() {
  try {
    const res = await api.post("/auth/logout");
    return res.data;
  } catch (err) {
    console.error("Logout error:", err);
    throw new Error("Logout failed");
  }
}

// -------------------- Protected API --------------------
export async function getCurrentUser() {
  const res = await api.get("/auth/me");
  return res.data.user;
}

export async function checkPermission(permission) {
  const res = await api.post("/auth/permissions", { permission });
  return !!res.data.hasPermission;
}

// -------------------- Local Cache Cleanup (Auto Expire) --------------------
function cleanupLocalCache(ttl = 300000) {
  const now = Date.now();
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("products:") || key.startsWith("settings:")) {
      try {
        const cached = JSON.parse(localStorage.getItem(key));
        if (!cached?.timestamp || now - cached.timestamp > ttl) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key); // ถ้า parse error → clear ไปเลย
      }
    }
  });
}

// schedule cleanup ทุก 1 นาที
setInterval(() => cleanupLocalCache(300000), 60 * 1000);
