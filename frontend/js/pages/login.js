import { 
  openModal, 
  closeModal, 
  initModal, 
  apiRequest, 
  showNotification 
} from "../utils.js";

export function init(container) {
  container.innerHTML = `
    <div class="login-container">
      <div class="login-box">
        <h2>Login</h2>
        <form id="login-form">
          <div class="input-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
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
            <label for="register-email">Email</label>
            <input type="email" id="register-email" name="email" required>
          </div>

          <div class="input-group">
            <label for="register-password">Password</label>
            <input type="password" id="register-password" name="password" required>
          </div>

          <div class="input-group">
            <label for="register-display-name">Display Name</label>
            <input type="text" id="register-display-name" name="display_name" required>
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
  container
    .querySelector("#open-register-modal")
    .addEventListener("click", () => openModal("register-modal"));

  // Handle Login Submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = container.querySelector("#email").value.trim();
    const password = container.querySelector("#password").value.trim();

    try {
      await apiRequest(
        "/api/auth/login",
        "POST",
        { email, password },
        { withCredentials: true } // allow cookies
      );

      showNotification("Login success!", "success");
      window.location.href = "/admin"; // redirect SPA route
    } catch (err) {
      console.error("Login Error:", err);
      showNotification("Invalid email or password", "error");
    }
  });

  // Handle Register Submit
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = container.querySelector("#register-email").value.trim();
    const password = container.querySelector("#register-password").value.trim();
    const display_name = container
      .querySelector("#register-display-name")
      .value.trim();

    try {
      await apiRequest(
        "/api/auth/register",
        "POST",
        { email, password, display_name },
        { withCredentials: true }
      );

      showNotification("Registration successful! Please login.", "success");
      closeModal("register-modal");
      registerForm.reset();
    } catch (err) {
      console.error("Register Error:", err);
      showNotification("Registration failed", "error");
    }
  });
}
