/**
 * ==========================
 * Modal Utilities
 * ==========================
 */

/**
 * Open a modal by ID
 * @param {string} modalId - The ID of the modal element
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "block";
}

/**
 * Close a modal by ID
 * @param {string} modalId - The ID of the modal element
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
}

/**
 * Initialize modal closing when clicking outside or on .close-button
 * @param {string} modalId - The ID of the modal element
 */
export function initModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Close when click outside
  window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modalId);
  });

  // Close when click close button
  const closeBtn = modal.querySelector(".close-button");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeModal(modalId));
  }
}

/**
 * ==========================
 * API Utilities
 * ==========================
 */

/**
 * API Request Wrapper (fetch)
 * @param {string} url
 * @param {string} method
 * @param {object|null} body
 * @returns {Promise<object>}
 */
export async function apiRequest(url, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "API Request failed");
  }
  return res.json();
}

/**
 * ==========================
 * General Utilities
 * ==========================
 */

/**
 * Debounce - limit how often a function is executed
 * @param {Function} func - The function to debounce
 * @param {number} wait - Delay in ms
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Capitalize - make first letter uppercase
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str = "") {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

/**
 * ==========================
 * Notification System
 * ==========================
 */

/**
 * Show a notification
 * @param {string} message - The text message
 * @param {string} type - success | error | warning | info
 * @param {number} duration - Auto-hide delay (ms). 0 = stay until closed
 */
export function showNotification(message, type = "info", duration = 5000) {
  // Create container if not exists
  if (!$(".notification-container").length) {
    $("body").append(`<div class="notification-container"></div>`);
  }

  // Build notification element
  const notification = $(`
    <div class="notification notification--${type}">
      <div class="notification__content">
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${capitalize(message)}</span>
      </div>
      <button class="notification__close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `);

  // Append to container
  $(".notification-container").append(notification);

  // Animate in
  setTimeout(() => notification.addClass("notification--show"), 50);

  // Auto hide
  if (duration > 0) {
    setTimeout(() => hideNotification(notification), duration);
  }

  // Close button handler
  notification.find(".notification__close").on("click", () => {
    hideNotification(notification);
  });
}

/**
 * Hide & remove notification
 * @param {jQuery} notification
 */
function hideNotification(notification) {
  notification.removeClass("notification--show");
  setTimeout(() => notification.remove(), 300);
}

/**
 * Get icon name for notification type
 * @param {string} type
 * @returns {string}
 */
function getNotificationIcon(type) {
  const icons = {
    success: "check-circle",
    warning: "exclamation-triangle",
    error: "times-circle",
    info: "info-circle",
  };
  return icons[type] || icons.info;
}
