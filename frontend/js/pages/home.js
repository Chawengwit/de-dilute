// frontend/js/pages/home.js
import { apiRequest } from "../utils.js";

export function init(container) {
  container.innerHTML = `
    <section class="home-page">
      <h2>Products</h2>
      <div id="product-list" class="product-list">Loading...</div>
    </section>
  `;

  const productList = container.querySelector("#product-list");

  // Load products
  apiRequest("/api/products/public", "GET")
    .then((products) => {
      if (!products.length) {
        productList.innerHTML = "<p>No products available.</p>";
        return;
      }

      productList.innerHTML = products
        .map(
          (p) => `
          <div class="product-card">
            <h3>${p.name}</h3>
            <p>${p.description || ""}</p>
            <p><strong>$${Number(p.price).toFixed(2)}</strong></p>
          </div>
        `
        )
        .join("");
    })
    .catch((err) => {
      console.error("Error loading products:", err);
      productList.innerHTML = "<p>❌ Failed to load products.</p>";
    });
}
