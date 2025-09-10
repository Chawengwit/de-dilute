import { openModal, closeModal, initModal, showNotification } from "../utils.js";
import { login, register } from "../api.js";
import { applyTranslations } from "../i18n.js";

export function init(container) {
  container.innerHTML = `
    <div class="login-container">
      <div class="login-box">
        <h2 data-i18n="login.title">Login</h2>
        <form id="login-form">
          <div class="input-group">
            <label for="email" data-i18n="login.email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>

          <div class="input-group">
            <label for="password" data-i18n="login.password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>

          <div class="button-group">
            <button type="submit" class="btn btn-primary" data-i18n="login.submit">Login</button>
            <button type="button" id="open-register-modal" class="btn btn-secondary" data-i18n="login.register">Register</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Register Modal -->
    <div id="register-modal" class="modal">
      <div class="modal-content">
        <span class="close-button">&times;</span>
        <h2 data-i18n="register.title">Create Account</h2>
        <form id="register-form">
          <div class="input-group">
            <label for="register-email" data-i18n="login.email">Email</label>
            <input type="email" id="register-email" name="email" required>
          </div>

          <div class="input-group">
            <label for="register-password" data-i18n="login.password">Password</label>
            <input type="password" id="register-password" name="password" required>
          </div>

          <div class="input-group">
            <label for="register-display-name" data-i18n="register.display_name">Display Name</label>
            <input type="text" id="register-display-name" name="display_name" required>
          </div>

          <div class="button-group">
            <button type="submit" class="btn btn-primary" data-i18n="login.register">Register</button>
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
  container
    .querySelector("#open-register-modal")
    .addEventListener("click", () => openModal("register-modal"));

  // Handle Login Submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = container.querySelector("#email").value.trim();
    const password = container.querySelector("#password").value.trim();

    try {
      await login(email, password);
      showNotification("login.success", "success"); // i18n key
      window.location.href = "/"; // redirect SPA route
    } catch (err) {
      console.error("Login Error:", err);
      showNotification("login.error", "error"); // i18n key
    }
  });

  // Handle Register Submit
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = container.querySelector("#register-email").value.trim();
    const password = container.querySelector("#register-password").value.trim();
    const display_name = container.querySelector("#register-display-name").value.trim();

    try {
      await register(email, password, display_name);
      showNotification("register.success", "success"); // i18n key
      closeModal("register-modal");
      registerForm.reset();
    } catch (err) {
      console.error("Register Error:", err);
      showNotification("register.error", "error"); // i18n key
    }
  });

  // Apply translations
  applyTranslations(container);
}
