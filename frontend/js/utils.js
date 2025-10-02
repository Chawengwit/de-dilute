// @frontend/js/utils.js

/**
 * ==========================
 * Modal Utilities (centralized)
 * ==========================
 * - openModal(modalId)
 * - closeModal(modalId)
 * - initModal(modalId)
 *
 * Features:
 *  • Click outside to close
 *  • Close button (.close-button)
 *  • ESC to close
 *  • Basic focus trap while open (first/last focusable)
 *  • Restore focus to the opener element
 *  • Set ARIA attributes for accessibility
 */

const _modalState = new Map(); // modalId -> { opener: HTMLElement|null, escHandler, focusHandler }

function _getFocusable(root) {
  return root.querySelectorAll(
    [
      "a[href]",
      "area[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "button:not([disabled])",
      "iframe",
      "audio[controls]",
      "video[controls]",
      "[contenteditable]",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",")
  );
}

/**
 * Open a modal by ID
 * @param {string} modalId - The ID of the modal element
 * @param {HTMLElement} [openerEl] - Element that opened the modal (for focus restore)
 */
export function openModal(modalId, openerEl = document.activeElement) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Cache opener to restore focus on close
  const state = _modalState.get(modalId) || {};
  state.opener = openerEl instanceof HTMLElement ? openerEl : null;
  _modalState.set(modalId, state);

  // ARIA & visibility
  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
  modal.setAttribute("role", modal.getAttribute("role") || "dialog");

  // Prevent background scroll (simple approach)
  document.documentElement.style.overflow = "hidden";

  // Focus first focusable element
  const focusables = _getFocusable(modal);
  if (focusables.length) focusables[0].focus();

  // Bind ESC & focus trap
  const escHandler = (e) => {
    if (e.key === "Escape") closeModal(modalId);
  };
  document.addEventListener("keydown", escHandler);

  const focusHandler = (e) => {
    if (!modal.contains(document.activeElement)) {
      // if focus left the modal, bring it back to the first focusable
      const items = _getFocusable(modal);
      if (items.length) items[0].focus();
    }
  };
  document.addEventListener("focusin", focusHandler);

  state.escHandler = escHandler;
  state.focusHandler = focusHandler;
}

/**
 * Close a modal by ID
 * @param {string} modalId - The ID of the modal element
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");

  // Restore scroll
  document.documentElement.style.overflow = "";

  // Unbind handlers
  const state = _modalState.get(modalId);
  if (state?.escHandler) document.removeEventListener("keydown", state.escHandler);
  if (state?.focusHandler) document.removeEventListener("focusin", state.focusHandler);

  // Restore focus to opener
  if (state?.opener && document.body.contains(state.opener)) {
    try {
      state.opener.focus();
    } catch (_) {}
  }

  _modalState.delete(modalId);
}

/**
 * Initialize modal behaviors:
 *  - Close when clicking outside content
 *  - Close on ".close-button"
 * @param {string} modalId - The ID of the modal element
 */
export function initModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Close on outside click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modalId);
  });

  // Close button
  const closeBtn = modal.querySelector(".close-button");
  if (closeBtn) closeBtn.addEventListener("click", () => closeModal(modalId));
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
 * @param {string} message - The text (can be i18n key or plain text)
 * @param {"success"|"error"|"warning"|"info"} type
 * @param {number} duration - Auto-hide delay (ms). 0 = stay until closed
 */
export function showNotification(message, type = "info", duration = 5000) {
  // Ensure container exists
  let container = document.querySelector(".notification-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  // Build element
  const notification = document.createElement("div");
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
    <div class="notification__content">
      <i class="fas fa-${_getNotificationIcon(type)}"></i>
      <span>${capitalize(message)}</span>
    </div>
    <button class="notification__close" aria-label="Close">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(notification);

  // Animate in
  requestAnimationFrame(() => notification.classList.add("notification--show"));

  // Auto hide
  if (duration > 0) {
    setTimeout(() => _hideNotification(notification), duration);
  }

  // Close button
  const closeBtn = notification.querySelector(".notification__close");
  if (closeBtn) closeBtn.addEventListener("click", () => _hideNotification(notification));
}

/* ====== Internal helpers for notifications ====== */
function _hideNotification(notification) {
  notification.classList.remove("notification--show");
  setTimeout(() => notification.remove(), 250);
}

function _getNotificationIcon(type) {
  const icons = {
    success: "check-circle",
    warning: "exclamation-triangle",
    error: "times-circle",
    info: "info-circle",
  };
  return icons[type] || icons.info;
}
