import { getProducts } from "../api.js";
import { applyTranslations } from "../i18n.js";

export function init(container) {
  container.innerHTML = `
    <section class="home-page">
      <h2 data-i18n="home.products">Products</h2>
      <div id="product-list" class="product-list" data-i18n="home.loading">Loading...</div>
    </section>
  `;

  const productList = container.querySelector("#product-list");

  getProducts(10, 0)
    .then((products) => {
      if (!products || !products.length) {
        productList.innerHTML = `<p data-i18n="home.no_products">No products available.</p>`;
        applyTranslations(productList);
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
      console.error("❌ Error loading products:", err);
      productList.innerHTML = `<p data-i18n="home.error">❌ Failed to load products.</p>`;
      applyTranslations(productList);
    });

  // Apply translation to static section
  applyTranslations(container);
}
