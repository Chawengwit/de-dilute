// frontend/js/pages/login.js
import { openModal, closeModal, initModal, apiRequest } from "../utils.js";

export function init(container) {
    container.innerHTML = `
        <div class="login-container">
        <div class="login-box">
            <h2>Login</h2>
            <form id="login-form">
            <div class="input-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>
            </div>

            <div class="input-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>

            <div class="button-group">
                <button type="submit" class="btn btn-primary">Login</button>
                <button type="button" id="open-register-modal" class="btn btn-secondary">Register</button>
            </div>
            </form>
        </div>
        </div>

        <!-- Register Modal -->
        <div id="register-modal" class="modal">
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h2>Create Account</h2>
            <form id="register-form">
            <div class="input-group">
                <label for="register-username">Username</label>
                <input type="text" id="register-username" name="username" required>
            </div>

            <div class="input-group">
                <label for="register-password">Password</label>
                <input type="password" id="register-password" name="password" required>
            </div>

            <div class="button-group">
                <button type="submit" class="btn btn-primary">Register</button>
            </div>
            </form>
        </div>
        </div>
    `;

    const loginForm = container.querySelector("#login-form");
    const registerForm = container.querySelector("#register-form");

    // Init modal behavior
    initModal("register-modal");

    // Open Register Modal
    container.querySelector("#open-register-modal").addEventListener("click", () => openModal("register-modal"));

    // Handle Login Submit
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = container.querySelector("#username").value.trim();
        const password = container.querySelector("#password").value.trim();

        try {
            const data = await apiRequest("/api/auth/login", "POST", { username, password });

            localStorage.setItem("token", data.token);
            alert("✅ Login success!");
            window.location.href = "/admin"; // redirect SPA route
        } catch (err) {
            console.error("Login Error:", err);
            alert("❌ Invalid username or password");
        }
    });

    // Handle Register Submit
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = container.querySelector("#register-username").value.trim();
        const password = container.querySelector("#register-password").value.trim();

        try {
            await apiRequest("/api/auth/register", "POST", { username, password });
            alert("✅ Registration successful! Please login.");
            closeModal("register-modal");
            registerForm.reset();
        } catch (err) {
            console.error("Register Error:", err);
            alert("❌ Registration failed");
        }
    });
}
