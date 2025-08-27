import axios from "https://cdn.jsdelivr.net/npm/axios@1.7.2/dist/axios.min.js";

// Axios instance with default config
const api = axios.create({
  baseURL: "/api", // Nginx will proxy this to backend:3000
  headers: { "Content-Type": "application/json" },
});

// ================== Example APIs ================== //

// Mock product data (for development fallback)
const mockProducts = [
  {
    id: 1,
    name: "De Dilute Lemon Soda",
    description: "Refreshing lemon soda with a fizzy kick.",
    price: 2.99,
  },
  {
    id: 2,
    name: "De Dilute Peach Tea",
    description: "Sweet peach tea with natural flavors.",
    price: 3.49,
  },
  {
    id: 3,
    name: "De Dilute Cold Brew",
    description: "Smooth and bold cold brew coffee.",
    price: 4.25,
  },
];

export async function getProducts(useMock = true) {
  try {
    if (useMock) {
      // Return mock data for development
      return mockProducts;
    }

    // Call backend API
    const res = await api.get("/products/public");
    return res.data;
  } catch (err) {
    console.error("Error fetching products:", err);
    throw new Error("Failed to load products");
  }
}
