// @frontend/js/api.js
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

function invalidateLocalCache(prefixes = []) {
  Object.keys(localStorage)
    .filter((k) => prefixes.some((p) => k.startsWith(p)))
    .forEach((k) => localStorage.removeItem(k));
}

// -------------------- Products (Public READ) --------------------
export async function getProducts(limit = 10, offset = 0) {
  return fetchWithLocalCache(`products:${limit}:${offset}`, async () => {
    const res = await api.get("/products/public", { params: { limit, offset } });
    return res.data; // backend ส่ง array rows
  });
}

// -------------------- Settings --------------------
export async function getSettings(lang = "en") {
  return fetchWithLocalCache(`settings:${lang}`, async () => {
    const res = await api.get("/settings", { params: { lang } });
    return res.data || {};
  });
}

export async function saveSettings(settings) {
  try {
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
    invalidateLocalCache(["settings:"]);

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
  return res.data?.user ?? null;
}

export async function checkPermission(permission) {
  // NOTE: ฝั่ง backend ของคุณควรมี /auth/permissions (POST) รองรับ
  const res = await api.post("/auth/permissions", { permission });
  return !!res.data?.hasPermission;
}

/** Helper: assert ADMIN permission (throw if not allowed) */
async function assertAdmin() {
  const ok = await checkPermission("ADMIN");
  if (!ok) throw new Error("Permission denied (ADMIN required)");
}

// -------------------- Products (ADMIN: CREATE / UPDATE / DELETE) --------------------

/**
 * Create Product (ADMIN only)
 * Backend: POST /api/products/add
 * @param {Object} payload { slug, name, description, price, is_active=true }
 */
export async function createProduct(payload) {
  await assertAdmin();

  const body = {
    slug: payload.slug,
    name: payload.name,
    description: payload.description ?? null,
    price: Number(payload.price),
    is_active: payload.is_active ?? true,
  };

  const res = await api.post("/products/add", body);

  // invalidate product list cache keys
  invalidateLocalCache(["products:"]);

  return res.data;
}

/**
 * Update Product (ADMIN only)
 * Backend: PUT /api/products/update/:id
 * @param {number|string} productId
 * @param {Object} payload { name?, description?, price?, is_active? }
 */
export async function updateProduct(productId, payload = {}) {
  await assertAdmin();

  // กรอง field ที่เป็น undefined ออก (กันส่งค่าไม่ตั้งใจ)
  const body = {};
  ["name", "description", "price", "is_active"].forEach((k) => {
    if (payload[k] !== undefined) body[k] = k === "price" ? Number(payload[k]) : payload[k];
  });

  if (Object.keys(body).length === 0) {
    throw new Error("No fields to update");
  }

  const res = await api.put(`/products/update/${productId}`, body);

  // invalidate product list cache keys
  invalidateLocalCache(["products:"]);

  return res.data;
}

/**
 * Delete Product (ADMIN only)
 * Backend: DELETE /api/products/delete/:id
 * @param {number|string} productId
 */
export async function deleteProduct(productId) {
  await assertAdmin();

  const res = await api.delete(`/products/delete/${productId}`);

  // invalidate product list cache keys
  invalidateLocalCache(["products:"]);

  return res.data;
}

/**
 * (Optional) Upload media for a product after create
 * Requires backend /api/media/upload (multipart/form-data)
 */
export async function uploadProductMedia(productId, files = []) {
  await assertAdmin();
  if (!files.length) return [];

  const fd = new FormData();
  fd.append("product_id", String(productId));
  files.forEach((f) => fd.append("files", f));

  const res = await api.post("/media/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
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
        localStorage.removeItem(key);
      }
    }
  });
}

// schedule cleanup ทุก 1 นาที
setInterval(() => cleanupLocalCache(300000), 60 * 1000);
