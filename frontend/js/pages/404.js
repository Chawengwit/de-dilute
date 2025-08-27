export function init(container) {
  container.innerHTML = `
    <h1>404 - Page Not Found</h1>
    <p>Sorry, the page you are looking for does not exist.</p>
    <a href="/" data-link>Go back Home</a>
  `;
}