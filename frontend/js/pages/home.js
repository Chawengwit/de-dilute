// import { getProducts } from '../api.js';

export function init(container) {
    container.innerHTML = `
        <h1>Welcome to the Home Page</h1>
        <div id="product-list">Loading products...</div>
    `;
    
    // TODO GET PRODUCTS AND RENDER THEM
    // const productList = document.getElementById('product-list');
    
    // getProducts().then(products => {
    //     if (products.length === 0) {
    //         productList.innerHTML = '<p>No products available.</p>';
    //         return;
    //     }
        
    //     const ul = document.createElement('ul');
    //     products.forEach(product => {
    //         const li = document.createElement('li');
    //         li.textContent = `${product.name} - $${product.price}`;
    //         ul.appendChild(li);
    //     });
    //     productList.innerHTML = '';
    //     productList.appendChild(ul);
    // }).catch(err => {
    //     productList.innerHTML = `<p>Error loading products: ${err.message}</p>`;
    // });
}