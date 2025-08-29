import { getProducts } from "../api.js";

export async function init(container) {
  container.innerHTML = `
    <h1>Welcome to the Home Page</h1>
    <div id="product-list">Loading products...</div>
  `;

  const productList = document.getElementById("product-list");

  try {
    const products = await getProducts();

    if (!products || products.length === 0) {
      productList.innerHTML = "<p>No products available.</p>";
      return;
    }

    productList.innerHTML = products
      .map((product) => {
        // render media (images/videos)
        const mediaHTML = (product.media || [])
          .map((m) => {
            if (m.type === "image") {
              return `<img src="${m.url}" alt="${product.name}" class="product-media" loading="lazy"/>`;
            } else if (m.type === "video") {
              return `<video src="${m.url}" controls class="product-media"></video>`;
            }
            return "";
          })
          .join("");

        return `
          <div class="product">
            <h2>${product.name}</h2>
            <p>${product.description || ""}</p>
            <p><strong>Price:</strong> $${Number(product.price).toFixed(2)}</p>
            <div class="media">${mediaHTML}</div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error("⚠️ Error loading products:", err);
    productList.innerHTML =
      "<p>⚠️ Error loading products. Please try again later.</p>";
  }
}
