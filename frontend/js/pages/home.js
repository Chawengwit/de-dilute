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
              <div class="product-image">
                <img src="${p.media?.[0]?.url || "/media/placeholder.png"}" 
                    alt="${p.name}" />
              </div>
              <div class="product-content">
                <h3 class="product-title">${p.name}</h3>
                <p class="product-desc">${p.description || ""}</p>
                <p class="product-price"><strong>$${Number(p.price).toFixed(2)}</strong></p>
                <button class="btn-add" data-id="${p.id}">Add to Cart</button>
              </div>
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
