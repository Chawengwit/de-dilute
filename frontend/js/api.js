// frontend/js/api.js
import axios from "./vendor/axios.esm.js";

// สร้าง instance สำหรับเรียก Backend API
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 5000,
  withCredentials: true,
});

/* -------------------- Interceptor -------------------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 🚫 suppress error log — ไม่โยน error ต่อ
      const url = error.config.url;
      if (url.includes("/auth/me")) {
        console.info("ℹ️ Guest mode: no user session");
        return Promise.resolve({ data: { user: null } });
      }
      if (url.includes("/auth/permissions")) {
        console.info("ℹ️ Guest mode: no permissions");
        return Promise.resolve({ data: { hasPermission: false } });
      }
      if (url.includes("/settings")) {
        console.info("ℹ️ Guest mode: settings not saved");
        return Promise.resolve({ data: null });
      }

      // default fallback
      return Promise.resolve({ data: null });
    }

    // error อื่น ๆ → ส่งต่อไปให้ catch
    return Promise.reject(error);
  }
);

/* -------------------- Products (Public) -------------------- */
export async function getProducts(limit = 10, offset = 0) {
  try {
    const res = await api.get("/products/public", { params: { limit, offset } });
    return res.data;
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    throw new Error("Failed to load products");
  }
}

/* -------------------- Settings -------------------- */
export async function getSettings(lang = "en") {
  try {
    const res = await api.get("/settings", { params: { lang } });
    return res.data;
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    throw new Error("Failed to load settings");
  }
}

export async function saveSettings(settings) {
  try {
    const res = await api.post("/settings", { settings });
    return res.data;
  } catch (err) {
    console.error("❌ Error saving settings:", err);
    throw new Error(err.response?.data?.error || "Failed to save settings");
  }
}

/* -------------------- Auth -------------------- */
export async function register(email, password, display_name) {
  try {
    const res = await api.post("/auth/register", { email, password, display_name });
    return res.data;
  } catch (err) {
    console.error("❌ Register error:", err);
    throw new Error(err.response?.data?.error || "Registration failed");
  }
}

export async function login(email, password) {
  try {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
  } catch (err) {
    console.error("❌ Login error:", err);
    throw new Error(err.response?.data?.error || "Login failed");
  }
}

export async function logout() {
  try {
    const res = await api.post("/auth/logout");
    return res.data;
  } catch (err) {
    console.error("❌ Logout error:", err);
    throw new Error("Logout failed");
  }
}

/* -------------------- Protected API -------------------- */
export async function getCurrentUser() {
  const res = await api.get("/auth/me");
  return res.data.user; // Interceptor จะจัดการ 401 → { user: null }
}

export async function checkPermission(permission) {
  const res = await api.post("/auth/permissions", { permission });
  return res.data.hasPermission; // Interceptor จะจัดการ 401 → false
}
