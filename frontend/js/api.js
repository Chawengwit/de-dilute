import axios from "./vendor/axios.esm.js";

// สร้าง instance ของ axios สำหรับเรียก Backend API
const api = axios.create({
  baseURL: "/api", // Nginx จะ proxy ไป backend:3000
  headers: { "Content-Type": "application/json" },
  timeout: 5000, // กัน request ค้าง
  withCredentials: true, // ส่ง cookie JWT ไปด้วย
});

/* -------------------- Products -------------------- */
export async function getProducts(limit = 10, offset = 0) {
  try {
    const res = await api.get("/products/public", {
      params: { limit, offset },
    });
    return res.data;
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    throw new Error("Failed to load products");
  }
}

/* -------------------- Settings -------------------- */
export async function getSettings(lang = "en") {
  try {
    const res = await api.get("/settings", {
      params: { lang },
    });
    return res.data; // { key1: {value, type, lang}, key2: {...} }
  } catch (err) {
    console.error("❌ Error fetching settings:", err);
    throw new Error("Failed to load settings");
  }
}

export async function saveSettings(settings) {
  try {
    // settings = [ { key, value, type?, lang? }, ... ]
    const res = await api.post("/settings", { settings });
    return res.data; // { message, settings: [...] }
  } catch (err) {
    console.error("❌ Error saving settings:", err);
    throw new Error(err.response?.data?.error || "Failed to save settings");
  }
}

/* -------------------- Auth -------------------- */
export async function register(email, password, display_name) {
  try {
    const res = await api.post("/auth/register", {
      email,
      password,
      display_name,
    });
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

export async function getCurrentUser() {
  try {
    const res = await api.get("/auth/me");
    return res.data.user; // { id, email, display_name }
  } catch (err) {
    console.error("❌ Get current user error:", err);
    throw new Error("Failed to fetch current user");
  }
}

export async function checkPermission(permission) {
  try {
    const res = await api.post("/auth/permissions", { permission });
    return res.data.hasPermission; // true/false
  } catch (err) {
    console.error("❌ Check permission error:", err);
    throw new Error("Failed to check permission");
  }
}
