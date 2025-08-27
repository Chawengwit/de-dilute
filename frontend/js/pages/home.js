import { getProducts } from '../api.js';

export async function init(container) {
    container.innerHTML = `
        <h1>Welcome to the Home Page</h1>
        <div id="product-list">Loading products...</div>
    `;

    const productList = document.getElementById('product-list');

    try {
        const products = await getProducts();

        productList.innerHTML = products.map(product => `
            <div class="product">
                <h2>${product.name}</h2>
                <p>${product.description}</p>
                <p>Price: $${product.price.toFixed(2)}</p>
            </div>
        `).join("");
    } catch (err) {
        if (productList) {
            productList.innerHTML = `<p>Error loading products: ${err.message}</p>`;
        }
    }
}