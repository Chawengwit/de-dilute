import axios from "https://unpkg.com/axios@1.6.7/dist/esm/axios.js";

// Axios instance with default config
const api = axios.create({
  // baseURL: "/api", // Nginx will proxy this to backend:3000
  baseURL: "http://localhost:3000/api", // TODO if finish then remove
  headers: { "Content-Type": "application/json" },
  timeout: 5000,
});

export async function getProducts() {
  try {
    // Call backend API
    const res = await api.get("/products/public");
    return res.data;

  } catch (err) {
    console.error("Error fetching products:", err);
    throw new Error("Failed to load products");
    
  }
}
