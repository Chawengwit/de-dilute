import axios from "./vendor/axios.esm.js";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 5000,
});

export async function getProducts() {
  try {
    const res = await api.get("/products/public");
    return res.data;
  } catch (err) {
    console.error("Error fetching products:", err);
    throw new Error("Failed to load products");
  }
}