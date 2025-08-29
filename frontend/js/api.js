import axios from "./vendor/axios.esm.js";

// สร้าง instance ของ axios สำหรับเรียก Backend API
const api = axios.create({
  baseURL: "/api", // Nginx จะ proxy ไป backend:3000
  headers: { "Content-Type": "application/json" },
  timeout: 5000, // กัน request ค้าง
});

/**
 * ดึง products (public) จาก backend
 * @returns {Promise<Array>} รายการสินค้า + media
 */
export async function getProducts() {
  try {
    const res = await api.get("/products/public");
    return res.data; // Array ของ products
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    throw new Error("Failed to load products");
  }
}
