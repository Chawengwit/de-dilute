// Entry point for the frontend JavaScript application
import App from './app.js';
import("/js/pages/home.js")

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();

    // Example: set footer year if available
    const yearEl = document.getElementById("year");
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
});