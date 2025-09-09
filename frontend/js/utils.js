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
 * Show a notification
 * @param {string} message - The text message
 * @param {string} type - success | error | warning | info
 * @param {number} duration - Auto-hide delay (ms). 0 = stay until closed
 */
export function showNotification(message, type = "info", duration = 5000) {
  // Create container if not exists
  let container = document.querySelector(".notification-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  // Build notification element
  const notification = document.createElement("div");
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
    <div class="notification__content">
      <i class="fas fa-${getNotificationIcon(type)}"></i>
      <span>${capitalize(message)}</span>
    </div>
    <button class="notification__close">
      <i class="fas fa-times"></i>
    </button>
  `;

  // Append to container
  container.appendChild(notification);

  // Animate in
  setTimeout(() => notification.classList.add("notification--show"), 50);

  // Auto hide
  if (duration > 0) {
    setTimeout(() => hideNotification(notification), duration);
  }

  // Close button handler
  const closeBtn = notification.querySelector(".notification__close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => hideNotification(notification));
  }
}

/**
 * Hide & remove notification
 * @param {HTMLElement} notification
 */
function hideNotification(notification) {
  notification.classList.remove("notification--show");
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
